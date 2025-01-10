const { Client, GatewayIntentBits, SlashCommandBuilder, Options, VoiceChannel } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

require('dotenv').config();

// トークンの設定
const TOKEN = process.env.TOKEN;
const API_KEY = process.env.API_KEY;

const VOICEVOX_URL = 'https://api.tts.quest/v3/voicevox/synthesis';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
});

const channelMap = new Map();

// Botが準備完了した時のログ
client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    const register = await client.application?.commands.set(slashcommand);
    if (register) {
        console.log(`/joinコマンドが登録されました。`);
    } else {
        console.log('スラッシュコマンドの登録に失敗しました。')
    }
});

const slashcommand = [
    new SlashCommandBuilder()
        .setName('join')
        .setDescription('ボイスチャンネルに参加してメッセージを読み上げます')
        .addChannelOption(option =>
            option.setName('参加するチャンネル')
                .setDescription('参加するボイスチャンネルを指定します。指定がない場合、あなたが現在参加中のボイスチャンネルに参加します。')
                .addChannelTypes(2)
                .setRequired(false),
        )
        .addChannelOption(option =>
            option.setName('読み上げ対象チャンネル')
            .setDescription('メッセージの読み上げ対象チャンネルを選択します。指定がない場合、botが参加中のボイスチャンネルのチャットになります。')
            .addChannelTypes(0)
            .setRequired(false),
        )
        .addStringOption(option =>
            option.setName('音声取得方法')
                .setDescription('音声の取得方法を選択します。通常はmp3ダウンロードです。')
                .addChoices({
                    name: 'streamingダウンロード',
                    value: 'stream'
                })
                .addChoices({
                    name: 'mp3ダウンロード',
                    value: 'mp3'
                }),
        ),
]

const generateMp3Url = async (text, type = 'mp3StreamingUrl') => {
    const response = await axios.get(VOICEVOX_URL, {
        params: { speaker: 1, text: decodeURIComponent(text), key: API_KEY },
        headers: { 'Content-Type': 'application/json' },
    });

    if (response.status !== 200) {
        throw new Error(`Failed to generate voice: ${response.statusText}`);
    }

    return response.data[type];
};

// 保存されている情報を取得する例
function getInfoByGuildId(guildId) {
    return channelMap.get(guildId) || null;
};

let connection;

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;
    if (interaction.commandName === 'join') {
        await interaction.deferReply();
        const joinchannel = interaction.options.getChannel('参加するチャンネル');
        const ttschannel = interaction.options.getChannel('読み上げ対象チャンネル');
        const method = interaction.options.getString('音声取得方法');

        const voicechannel = joinchannel || interaction.member.voice.channel;
        if (!voicechannel) {
            await interaction.editReply('ボイスチャンネルに参加して下さい。');
            return;
        }

        // 新たに接続
        connection = joinVoiceChannel({
            channelId: voicechannel.id,
            guildId: interaction.guild.id,
            adapterCreator: interaction.guild.voiceAdapterCreator,
        });

        // サーバーIDをキーとして情報を保存
        channelMap.set(interaction.guild.id, {
            channelId: ttschannel.id || voicechannel.id,
            method: method,
        });

        await interaction.editReply(`ボイスチャンネル「${voicechannel}」に参加しました！`);
    }
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const content = message.content;
    const guildId = message.guild.id;
    const info = getInfoByGuildId(guildId);
    if (info) {
        const ttschannel = info.channelId;
        const method = info.method;

        if (message.channel.id !== ttschannel || undefined) {
            return;
        };

        const tempDir = path.join(__dirname, 'temp');
        const tempFilePath = path.join(tempDir, 'tts.mp3');

        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir);
        }

        const player = createAudioPlayer();

        if (method === 'stream') {
            const url = await generateMp3Url(content, 'mp3StreamingUrl');
            const response = await axios.get(url, { responseType: 'stream' });
            const writer = fs.createWriteStream(tempFilePath);
            response.data.pipe(writer);
            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            const resource = createAudioResource(tempFilePath);
            player.play(resource);
        } else {
            const url = await generateMp3Url(content, 'mp3DownloadUrl');
            const response = await axios.get(url, { responseType: 'stream' });
            const writer = fs.createWriteStream(tempFilePath);
            response.data.pipe(writer);
            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            const resource = createAudioResource(tempFilePath);
            player.play(resource);
        }

        connection.subscribe(player);

        player.on(AudioPlayerStatus.Idle, () => {
            player.stop();
            if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
        });

        player.on('error', (error) => {
            console.error('Player error:', error);
            player.stop();
            connection.destroy();
            if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
        });
    }
});

client.on('voiceStateUpdate', (oldState, newState) => {
    if (!connection) return;

    const channel = connection.joinConfig.channelId;
    const voiceChannel = oldState.guild.channels.cache.get(channel);
    if (!voiceChannel) return;

    if (voiceChannel.members.size === 1) {
        channelMap.delete(oldState.guild.id);
        connection.destroy();
        console.log('全員が退出したため、ボイスチャンネルから抜けました。');
    }
});



/*
// 使い方
const mp3StreamingUrl = await generateMp3Url('サンプルテキスト', 'mp3StreamingUrl');
const mp3DownloadUrl = await generateMp3Url('サンプルテキスト', 'mp3DownloadUrl');
*/

client.login(TOKEN);
