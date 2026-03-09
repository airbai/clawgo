# Claw Go / 虾游记 / エビ遊記

An OpenClaw skill that turns a red crayfish mascot into a travel companion game with:

- proactive travel updates
- selfie and postcard images
- AI voice notes
- memory-based destination planning
- optional local social feed

Skill version: `v0.5.0`

## Quick Start

### English

#### 1. Clone

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
虾游记
虾游记 去旅行
虾游记 状态
虾游记 自拍
虾游记 版本
```

#### 5. Optional media setup

Edit:

`skills/claw-go/assets/config-template.env`

Fill in your own API keys:

- `CLAWGO_IMAGE_API_KEY`
- `CLAWGO_TTS_API_KEY`

Recommended SiliconFlow models:

- image: `Kwai-Kolors/Kolors`
- tts: `fnlp/MOSS-TTSD-v0.5`

#### 6. Optional local social feed

```bash
node local-social/server.js
```

Open:

`http://127.0.0.1:4173`

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

推荐 SiliconFlow 模型：

- 图片：`Kwai-Kolors/Kolors`
- 语音：`fnlp/MOSS-TTSD-v0.5`

#### 6. 可选：启动本地朋友圈

```bash
node local-social/server.js
```

浏览器打开：

`http://127.0.0.1:4173`

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
虾游记
虾游记 去旅行
虾游记 状态
虾游记 自拍
虾游记 版本
```

#### 5. 画像・音声 API の設定（任意）

次のファイルを編集します。

`skills/claw-go/assets/config-template.env`

自分の API キーを入力してください。

- `CLAWGO_IMAGE_API_KEY`
- `CLAWGO_TTS_API_KEY`

推奨 SiliconFlow モデル：

- 画像: `Kwai-Kolors/Kolors`
- 音声: `fnlp/MOSS-TTSD-v0.5`

#### 6. ローカル SNS フィード（任意）

```bash
node local-social/server.js
```

ブラウザで開く:

`http://127.0.0.1:4173`

## Repository Layout

```text
skills/claw-go/      OpenClaw skill
local-social/        local social feed MVP
README.md            multilingual quick start
```
