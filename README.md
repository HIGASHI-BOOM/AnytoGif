# Any to GIF Pro（任意格式转 GIF 专业版）

一个基于浏览器的转换器，可将专业视频或图像序列转成高质量 GIF。全部由客户端的 FFmpeg.wasm 驱动，因此可以直接部署到 GitHub Pages，无需任何后端服务。

## 功能特性

- **视频转 GIF**：在浏览器中直接转换 H.264 MP4、支持透明通道的 MOV，以及 AVI 源文件。
- **PNG 序列支持**：拖入有序的 PNG 序列（含透明通道）即可生成动画 GIF。
- **完整输出控制**：可调节宽度、高度、帧率、质量以及循环次数。
- **注重隐私**：所有处理均在本地浏览器完成，文件不会离开你的设备。
- **优化输出**：调色板生成配合 Floyd-Steinberg 抖动算法，让色彩更加细腻。

## 快速开始

1. 克隆此仓库后直接在现代浏览器中打开 `index.html`，或者将仓库部署到 GitHub Pages。
2. 载入源文件：
   - 单个 MP4 / MOV / AVI 视频（推荐 H.264 编码）。
   - 多个 PNG 帧（一次性选择）用于组合成序列。
3. 配置导出选项，然后点击 **Convert to GIF（转换为 GIF）**。
4. 首次使用时等待 FFmpeg.wasm（约 25 MB）下载，并实时关注转换进度。
5. 预览生成的 GIF 并直接下载。

## 技术栈

- [FFmpeg.wasm](https://ffmpegwasm.netlify.app/)：在浏览器端完成编码。
- 原生 HTML、CSS 与 JavaScript：非常适合静态托管。

## 部署提示

- 启用 GitHub Pages（Settings > Pages > Deploy from branch），选择 main 分支的根目录。
- 发布后，无需额外配置即可通过你的 GitHub Pages URL 访问应用。

## 后续规划

- 支持 PNG 序列的拖拽排序。
- 提供常用社交媒体 GIF 尺寸预设。
- 支持多个任务的批量转换队列。

欢迎提交改进意见与贡献！
