# video-agent-webui

Separated frontend for VideoAgent.

## Features

- Generate an image through `video-agent` API.
- Create a video generation task through `video-agent` API.
- Poll video task status.
- View task metadata, script/storyboard, and output manifest.
- Open and download generated image/video URLs.
- Download local prompt and manifest artifacts.
- Configure backend API base URL in the page.

## Start

For local mock generation, start only these two projects:

```text
1. video-agent
2. video-agent-webui
```

For real image/video generation, start dependencies first:

```text
1. tenx-ai-gateway
2. tenx-ai-media-service
3. video-agent
4. video-agent-webui
```

## Start 1: video-agent

Start backend first:

```bash
cd /Users/junweili1992163.com/ljwStudy/study-ai/video-agent
source .venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8090 --reload
```

## Start 2: video-agent-webui

Start WebUI:

```bash
cd /Users/junweili1992163.com/ljwStudy/study-ai/video-agent-webui
npm install
npm run dev
```

Open:

```text
http://127.0.0.1:5174
```

Default backend API:

```text
http://127.0.0.1:8090/api/v1
```

For real media generation, configure the backend environment:

```bash
export AI_GATEWAY_BASE_URL=http://127.0.0.1:8088/v1
export AI_GATEWAY_API_KEY=local-dev-key
export TENX_AI_MEDIA_BASE_URL=http://127.0.0.1:8092/api/v1
export TENX_AI_MEDIA_API_KEY=local-dev-key
export VIDEO_AGENT_ENABLE_REMOTE_MEDIA=true
```

## Build

```bash
npm run build
```
