# discordbot-TTS

discord内のボイスチャンネルで使用可能なメッセージ読み上げbot


## 使用方法

1. 本リポジトリをcloneする
```git
git clone https://github.com/haruki-0315/discordbot-TTS.git
```

2. 必要なライブラリをインストールする
```bash
npm i
```

3. .env.exampleを参考にして、環境変数を設定する

4. 下記コマンドを実行する
```bash
node src/index.js
```

## 環境変数について
- TOKEN
[Discord Developer Portal](https://discord.com/developers/applications)から取得したトークンを記入してください。
- API_KEY
- [WEB版VOICEVOX API（高速）](https://voicevox.su-shiki.com/su-shikiapis/)から、[apiKeyの取得](https://su-shiki.com/api/)を押してapiKeyを発行し、そのkeyを記入して下さい。

## 必要な環境
以下のシステムがインストールされている必要があります。
(記載バージョンより低くても動く可能性はありますが、保証はしません。)
- Node.js v20.18.1以上
- npm 10.8.2以上
- git version 2.47.1以上

## Special Thanks
[ts-klassenさん](https://github.com/ts-klassen)の[ts-klassen/ttsQuestV3Voicevox](https://github.com/ts-klassen/ttsQuestV3Voicevox)を用いた[WEB版API](https://voicevox.su-shiki.com/su-shikiapis/)を使用しています。

## ライセンス
MIT licenseで公開しています。このリポジトリを使って出来たコードは、同じライセンスで公開する必要があります。ご注意下さい。

~~ 果たしてライセンスは必要なのか...？~~
