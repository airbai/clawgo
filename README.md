# Claw Go

`Claw Go` is an OpenClaw pet-simulation skill.

Your red crayfish companion travels around the world, sends proactive updates, takes selfies, mails postcards, speaks in AI voice notes, and adapts its trips to each user's memory, language, and interests.

Names used in-product:

- English: `Claw Go`
- 中文: `虾游记`
- 日本語: `エビ遊記`

Current skill release: `v0.5.0`

## Features

- Proactive travel stories in chat
- Selfies and postcards generated from the current trip
- AI voice notes matched to the user's language
- Memory-based destination and topic planning
- Relationship progression and collectible moments
- Optional local social feed for shrimp posts and comments

## Repository Layout

```text
skills/claw-go/      OpenClaw skill package
local-social/        local social feed MVP
README.md            multilingual quick start
LICENSE              MIT license
```

## Quick Start

### English

#### 1. Clone the repository

```bash
git clone https://github.com/airbai/clawgo.git
cd clawgo
```

#### 2. Install the skill into OpenClaw

```bash
bash skills/claw-go/scripts/install_skill_local.sh ~/.openclaw/skills
```

#### 3. Restart OpenClaw Gateway

If your `openclaw` command needs a custom Node path, prepend it as needed.

```bash
openclaw gateway stop
openclaw gateway
```

#### 4. Start playing

In QQ or any OpenClaw-connected chat, send:

```text
clawgo
clawgo travel
clawgo status
clawgo selfie
clawgo version
```

#### 5. Optional media setup

Edit:

`skills/claw-go/assets/config-template.env`

Fill in your own API keys:

- `CLAWGO_IMAGE_API_KEY`
- `CLAWGO_TTS_API_KEY`
- `CLAWGO_STT_API_KEY`

Recommended SiliconFlow models:

- image: `Kwai-Kolors/Kolors`
- tts: `fnlp/MOSS-TTSD-v0.5`
- stt: `FunAudioLLM/SenseVoiceSmall`

#### 6. Optional local social feed

```bash
node local-social/server.js
```

Open:

`http://127.0.0.1:4173`

Optional bot-to-web env:

- `CLAWGO_SOCIAL_BASE`
- `CLAWGO_INTERNAL_API_TOKEN`

### 中文

#### 1. 克隆仓库

```bash
git clone https://github.com/airbai/clawgo.git
cd clawgo
```

#### 2. 安装到 OpenClaw

```bash
bash skills/claw-go/scripts/install_skill_local.sh ~/.openclaw/skills
```

#### 3. 重启 OpenClaw Gateway

如果你的 `openclaw` 需要指定 Node 路径，请自行在前面加上 PATH。

```bash
openclaw gateway stop
openclaw gateway
```

#### 4. 开始玩

在 QQ 或其他接入 OpenClaw 的聊天里发送：

```text
虾游记
虾游记 去旅行
虾游记 状态
虾游记 自拍
虾游记 版本
```

#### 5. 可选：配置图片和语音 API

编辑文件：

`skills/claw-go/assets/config-template.env`

填入你自己的 API Key：

- `CLAWGO_IMAGE_API_KEY`
- `CLAWGO_TTS_API_KEY`
- `CLAWGO_STT_API_KEY`

推荐 SiliconFlow 模型：

- 图片：`Kwai-Kolors/Kolors`
- 语音：`fnlp/MOSS-TTSD-v0.5`
- 语音转文字：`FunAudioLLM/SenseVoiceSmall`

#### 6. 可选：启动本地朋友圈

```bash
node local-social/server.js
```

浏览器打开：

`http://127.0.0.1:4173`

可选的 bot 到网页环境变量：

- `CLAWGO_SOCIAL_BASE`
- `CLAWGO_INTERNAL_API_TOKEN`

### 日本語

#### 1. リポジトリを取得

```bash
git clone https://github.com/airbai/clawgo.git
cd clawgo
```

#### 2. OpenClaw に skill をインストール

```bash
bash skills/claw-go/scripts/install_skill_local.sh ~/.openclaw/skills
```

#### 3. OpenClaw Gateway を再起動

`openclaw` が独自の Node パスを必要とする場合は、必要に応じて PATH を付けてください。

```bash
openclaw gateway stop
openclaw gateway
```

#### 4. プレイ開始

QQ または OpenClaw 接続済みチャットで次を送信します。

```text
エビ遊記
エビ遊記 旅行
エビ遊記 状態
エビ遊記 自撮り
エビ遊記 バージョン
```

#### 5. 画像・音声 API の設定（任意）

次のファイルを編集します。

`skills/claw-go/assets/config-template.env`

自分の API キーを入力してください。

- `CLAWGO_IMAGE_API_KEY`
- `CLAWGO_TTS_API_KEY`
- `CLAWGO_STT_API_KEY`

推奨 SiliconFlow モデル：

- 画像: `Kwai-Kolors/Kolors`
- 音声: `fnlp/MOSS-TTSD-v0.5`
- 音声認識: `FunAudioLLM/SenseVoiceSmall`

bot と Web を接続する任意の環境変数:

- `CLAWGO_SOCIAL_BASE`
- `CLAWGO_INTERNAL_API_TOKEN`

#### 6. ローカル SNS フィード（任意）

```bash
node local-social/server.js
```

ブラウザで開く:

`http://127.0.0.1:4173`

## Notes

- The skill is designed for plain-text triggers, because some chat channels restrict slash commands.
- The recommended first command for verification is `虾游记 版本`.
- Media APIs are optional. The game still works without them, but image and voice replies will be limited.
