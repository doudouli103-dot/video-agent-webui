# video-agent-webui

Separated frontend for VideoAgent.

## Features

- Generate an image through `video-agent` API.
- Create a video generation task through `video-agent` API.
- Poll video task status.
- Retry failed video tasks through `video-agent`.
- View task metadata, script/storyboard, and output manifest.
- Open and download generated image/video URLs.
- Download local prompt and manifest artifacts.
- Configure backend API base URL in the page.

## Project Role

`video-agent-webui` is the separated frontend for `video-agent`. It does not call `tenx-ai-gateway`, `tenx-ai-media-service`, or `tenx-ai-tts-adapter` directly. All generation requests go through the `video-agent` backend.

Frontend boundary:

```text
video-agent-webui
  -> video-agent only
```

Backend dependencies are configured on `video-agent`, not inside this WebUI.

## Calling Chains

Create a video:

```text
browser
  -> video-agent-webui
      -> video-agent /api/v1/videos
          -> tenx-ai-gateway for script
          -> tenx-ai-tts-adapter for speech
          -> tenx-ai-media-service for image/video generation
          -> local FFmpeg for final.mp4 when local shot videos exist
```

Generate one image:

```text
browser
  -> video-agent-webui
      -> video-agent /api/v1/images
          -> tenx-ai-media-service /api/v1/images/generations when remote media is enabled
          -> local prompt artifact when remote media is disabled
```

Download media:

```text
Remote generated image/video:
browser
  -> video-agent-webui
      -> opens URL returned by tenx-ai-media-service /api/v1/assets/<file_id>

Local project artifacts:
browser
  -> video-agent-webui
      -> video-agent /api/v1/artifacts/<relative_storage_path>
```

## Start

For local mock generation, start only these two projects:

```text
1. video-agent
2. video-agent-webui
```

For real image/video generation, start dependencies first:

```text
1. tenx-ai-tts-adapter
2. tenx-ai-gateway
3. tenx-ai-media-service
4. video-agent
5. video-agent-webui
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
export TTS_ADAPTER_BASE_URL=http://127.0.0.1:4030/v1
export TTS_ADAPTER_API_KEY=local-dev-key
export VIDEO_AGENT_ENABLE_REMOTE_MEDIA=true
export VIDEO_AGENT_ENABLE_TTS_ADAPTER=true
export VIDEO_AGENT_SPEECH_MODEL=cosyvoice
export VIDEO_AGENT_SPEECH_VOICE=default
```

## Build

```bash
npm run build
```
