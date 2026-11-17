---
name: 哈工威·云上校园
description: 保留原雏形的绿色悬浮导览界面与程序化三维校园
colors:
  ink: "#15372f"
  muted: "#4e675e"
  accent: "#175747"
  deep: "#133b32"
  paper: "#fbfcf3"
  panel: "rgba(251,252,243,.95)"
  line: "#dce5d9"
  on-deep: "#fffbed"
  hover: "#e1ede0"
  tool-selected: "#d6e7d3"
  row-selected: "#e2ecd9"
  button-focus: "#d9a64d"
  field-focus: "#a47b28"
  label-study: "#245c4e"
  label-life: "#92523a"
  label-sport: "#365d73"
  label-gate: "#686044"
typography:
  display:
    fontFamily: '"Microsoft YaHei","PingFang SC","Noto Sans CJK SC",system-ui,sans-serif'
    fontSize: "clamp(24px,5.7vw,39px)"
    fontWeight: 700
    lineHeight: 1.16
    letterSpacing: "-.025em"
  title:
    fontFamily: '"Microsoft YaHei","PingFang SC","Noto Sans CJK SC",system-ui,sans-serif'
    fontSize: "20px"
    fontWeight: 700
  panel-title:
    fontFamily: '"Microsoft YaHei","PingFang SC","Noto Sans CJK SC",system-ui,sans-serif'
    fontSize: "17px"
    fontWeight: 700
  body:
    fontFamily: '"Microsoft YaHei","PingFang SC","Noto Sans CJK SC",system-ui,sans-serif'
    fontSize: "13px"
    lineHeight: 1.65
  control:
    fontFamily: '"Microsoft YaHei","PingFang SC","Noto Sans CJK SC",system-ui,sans-serif'
    fontSize: "12px"
    fontWeight: 750
  label:
    fontFamily: '"Microsoft YaHei","PingFang SC","Noto Sans CJK SC",system-ui,sans-serif'
    fontSize: "11px"
    fontWeight: 700
    lineHeight: 1.35
rounded:
  badge: "3px"
  compact: "4px"
  control: "5px"
  action: "6px"
  card: "7px"
  panel: "9px"
  intro: "13px"
spacing:
  tight: "3px"
  small: "6px"
  control: "10px"
  group: "12px"
  panel-mobile: "16px"
  panel: "18px"
  detail: "19px"
  gutter: "clamp(12px, 2.2vw, 32px)"
components:
  button-primary:
    backgroundColor: "{colors.deep}"
    textColor: "{colors.on-deep}"
    rounded: "{rounded.action}"
    padding: "10px 12px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.action}"
    padding: "10px 12px"
  mode-button:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "5px 10px"
  mode-button-active:
    backgroundColor: "{colors.deep}"
    textColor: "{colors.on-deep}"
    rounded: "{rounded.control}"
  tool-button:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "8px"
  search:
    backgroundColor: "white"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px"
  category:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.compact}"
    padding: "7px 4px"
  category-active:
    backgroundColor: "{colors.deep}"
    textColor: "{colors.paper}"
    rounded: "{rounded.compact}"
  floating-panel:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
  directory:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "18px"
    width: "288px"
---

# Design System: 哈工威·云上校园

## Overview

**Creative North Star: "校园画面与悬浮导览"**

这是对现有实现的描述性归档，不是新设的品牌方向。用户提供的原始 HTML 决定绿色导览界面、浅色浮层、程序化建筑细节，以及第一人称和俯瞰两种体验。全屏三维校园是主画面；工具、目录、详情和小地图以紧凑浮层辅助探索。

界面保持中文优先的校园导览语气。低饱和绿、米白面板与场景中的暖色建筑和蓝灰窗格相接。建筑位置以用户地图人工描绘；地形、楼高、层数、外立面及场景单位均为示意。地图图面上方不能被当作已校准的地理正北。

**Key Characteristics:**

- 全屏三维画面配悬浮导览，避免挤占校园视野。
- 深绿表示主要操作与当前模式，浅绿表示辅助工具或条目选择。
- 中文系统字体、紧凑信息密度、轻圆角与柔和投影。
- 保留原始建筑窗格、屋顶和地标差异，以用户地图约束平面布局。

## Colors

前置 token 是 UI 色彩的规范来源；场景材质由 `src/app.js`、`src/model.js`、`src/south-gate.js` 与 `src/realism.js` 管理。

### Primary

- **校园深绿**（deep）：启动主操作、当前漫游模式和当前分类。
- **操作绿**（accent）：输入光标与原生输入强调。
- **浅叶绿**（hover、tool-selected、row-selected）：分别用于工具悬停、工具开启、目录条目悬停或选中。

### Secondary

- **分类标记**（label-study、label-life、label-sport、label-gate）：教学绿、生活棕、运动蓝、入口橄榄色仅用于场景标注的分类识别，文字名称同时传达类别。
- **金色焦点**（button-focus、field-focus）：区分键盘焦点；场景选中目标另用金色地面环。

### Neutral

- **深绿墨色**（ink）：标题、按钮和主要信息。
- **柔绿灰**（muted）：说明、操作提示和辅助信息。
- **米白纸面**（paper、panel）：目录、详情与参考图窗口使用实色纸面；启动卡、HUD、品牌和小地图使用轻透明纸面。
- **浅绿边线**（line）：分隔、面板轮廓和列表底线。
- **暖白字色**（on-deep）：深绿按钮上的文字。

**The State Meaning Rule.** 深绿整块填充表示主要操作或当前模式；辅助工具开启用浅绿填充，不能只靠颜色隐藏状态文字和 ARIA 状态。

场景保留浅蓝天空、绿色地形、暖米色墙体、蓝灰窗格、深色屋顶与赭红跑道。材质受光照、雾和色调映射影响，不能用渲染截图取色覆盖原材质值。

南门照片细化使用局部材质：墙面 `#d1b786`、檐线 `#e5dfca`、凹部 `#b49b74`、槽纹柱 `#c9b58d`、铁艺 `#263331`、窗玻璃 `#587781`、沥青 `#434947` 与灯杆 `#c6cecc`。这些是建筑物材质，不替换 UI 语义色。三拱、四条柱轴、翼房、校名牌匾与敞开铁艺门是该建筑的识别特征；参见 `docs/SOUTH-GATE.md`。

日间质感细化由 `src/realism.js` 管理：世界坐标纹理、表面微起伏、分析式天空及环境反射、AgX 色调映射和局部阴影。南门沥青基色改为 `#434947`，人行铺装为 `#d4cfbb`；墙体和檐线保留照片细化配色。桌面近景增加 GTAO 接触阴影，窄屏与不支持浮点目标的设备不启用该后期处理。光影采用自然日间方向，不额外给 UI 加光晕、滤镜或玻璃装饰；参见 `docs/REALISM.md`。

## Typography

**Display Font / Body Font:** Microsoft YaHei → PingFang SC → Noto Sans CJK SC → system-ui → sans-serif。离线产物不请求网络字体。

**Character:** 中文优先的直接、清楚的校园工具文字。标题与正文共用字体栈，依赖字号、字重与留白建立层级。HIT 小标记保留 Georgia 衬线字；英文副标使用 system-ui。

### Hierarchy

- **Display:** 启动卡标题使用 display token；窄屏自然缩小，避免大标题遮住校园。
- **Title:** 建筑详情标题使用 title；手机调整为（18px）。
- **Panel title:** 目录和参考图标题使用 panel-title。
- **Body:** 启动说明使用 body；建筑详情说明为（12px，1.8 行高），手机为（11px）。
- **Control:** 桌面模式按钮使用 control；工具文字为（11px），手机工具为（10px）。
- **Label:** 场景标签使用 label；手机为（9px），编号徽标从（9px）降为（8px）。英文品牌副标为（9px，700，.17em 字距），手机为（8px）。

## Layout

浏览器页面和画布占满视口，页面本身不滚动。悬浮界面的横向边距使用 gutter；顶部和底部关键浮层考虑 safe-area。桌面品牌置左上、小地图置右上、HUD 水平居中靠底。小地图最终桌面宽度为（132px），启动卡宽度上限为（414px），内边距随视口从（23px）至（38px）。

目录位于左侧，顶部（96px）、底部（120px）、宽（288px）、内边距（18px）；列表内部滚动。详情位于右下，宽（278px）、内边距（19px）、底部（120px）。HUD 允许换行，模式、缩放与工具保持分组。参考图对话框宽度上限为（850px），距视口横边至少（12px），高度不超过（92dvh），图像区域单独滚动。

响应边界为：
- 视口宽度不大于（1050px）：隐藏文本操作提示。
- 视口宽度不大于（700px）：品牌收紧、小地图宽（83px），HUD 宽为视口减（24px），工具独占一行；目录和详情宽为视口减（24px）。打开目录隐藏详情，选中目录条目后关闭目录并展示详情。
- 视口高度不大于（460px）：启动卡收紧至（14px）内边距，启动操作横向两列。

小间距常见（3–6px），控件内部留白常见（8–12px），面板内部常见（16–19px）。这是一套实际使用值，不要求全部尺寸硬套等比刻度。

## Elevation & Depth

界面使用真实三维场景与轻透明浮层的混合深度。面板依靠柔和阴影、细边线与纸面遮挡场景；不额外使用模糊玻璃效果。画布为底层，品牌和地图层级（2），HUD、目录和详情（3），巡览状态和通知（4），启动遮罩（5）；参考图使用原生模态对话框的顶层。

### Shadow Vocabulary

- **悬浮面板:** `0 12px 40px #152f3326`，品牌、小地图、HUD、目录和详情共用。
- **启动卡:** `0 22px 70px #20353540`，加强首次进入的层次。
- **建筑标签:** `0 2px 10px #203b352b`，分离场景背景。
- **准星:** `0 0 3px #132b22`，保证亮色准星在建筑和天空前可辨。

## Shapes

使用轻圆角矩形，不做药丸按钮。分类和关闭按钮用 compact，常规工具、搜索和标签用 control，启动操作用 action，场景信息卡用 card，主要浮层用 panel，启动卡用 intro。细边线界定浮层和条目。HIT 标记是小型方块；场景标签带独立编号徽标。三维场景保留体块、窗格、坡顶、环形图书馆与体育场的几何差异。

## Components

### Buttons

主要启动按钮为深绿底、暖白字；次要启动按钮透明底、浅绿描边。启动操作悬停使用（brightness 1.16）。模式和工具按钮平时透明、悬停浅绿；当前模式深绿，开启的辅助工具浅绿。禁用按钮透明度（.55），光标恢复默认；所有按钮键盘焦点显示（3px）金色轮廓并外移（3px）。按钮没有补设未实现的按压位移动画。

### Navigation

底部 HUD 是模式与探索工具的统一入口：第一人称、俯瞰、缩放、目录、原图、复位、标注、自转和巡览。当前模式使用 aria-pressed，目录使用 aria-expanded，工具开关使用 aria-pressed。第一人称需要支持 Pointer Lock 的精细指针设备；触屏以俯瞰、拖拽和双指缩放探索。手机保留实际短文字，不替换为无说明图标。

### Chips

目录五个分类按钮采用细边框、透明底和紧凑文字。选中分类为深绿填充；类别可与搜索共同筛选。空结果显示明确说明和“清除搜索与分类”按钮，结果数通过状态区域更新。

### Cards / Containers

启动卡、品牌、小地图和 HUD 为轻透明纸面；目录、详情及参考图为实色纸面。目录条目由横线分隔，悬停和选中使用相同浅绿底；右侧小字号显示类别。详情有关闭按钮、建筑描述和“到附近漫游”操作。建模限制说明是内容的一部分，不能为视觉简化删去。

### Inputs / Fields

搜索框白底、浅绿描边、轻圆角，内边距（10px），最小高度（40px）。占位符使用较深绿灰，聚焦时（3px）深金色轮廓。搜索即时过滤名称与内部标识。没有独立错误输入状态；不要虚构红色校验体系。

### Scene Labels and Selection

场景标签为纸面小矩形，左侧彩色编号区标识类别。标签在俯瞰下显示，缩放和遮挡逻辑控制密度；点击标签、建筑或目录条目聚焦建筑并打开详情。目录提供键盘可达的等价选择路径。选中目标通常使用地面金色环；南门正面近景隐藏光圈和其他建筑标签，使立面保持清晰。第一人称采用白色准星，命中可交互建筑时变浅亮绿，并显示目标名称；E 打开说明。

### Reference Dialog

原生模态对话框包含标题、来源限制说明、关闭操作和可滚动原始地图。深绿半透明背景遮罩隔开场景。关闭恢复到打开前的焦点；打开时释放指针锁。

### Motion and View Modes

初始不自转。自转是显式开关，拖拽结束后等待（850ms）再继续，进入应用后的速度为（.075 rad/s）。相机目标和距离使用指数插值，速率分别为（4/s）和（8/s）。六站巡览每站停留（6500ms），用户可以停止，手动选建筑会终止巡览。

尊重 prefers-reduced-motion：禁止 CSS 动画与过渡，关闭自转的实际运动，聚焦和缩放直接到目标。巡览仍可按六站切换，减少动态偏好不取消用户发起的第一人称操作。第一人称有碰撞和地形约束，Esc 释放鼠标，失焦停止移动。

## Do's and Don'ts

### Do:

- **Do** 保持校园画面为主，使用紧凑的绿色悬浮导览。
- **Do** 沿用中文字体栈、轻圆角、纸面与现有按钮状态语义。
- **Do** 为画布操作保留目录、文字按钮和键盘入口。
- **Do** 对照用户地图调整平面布局，并保留示意模型说明。
- **Do** 保持减少动态偏好对自转和相机过渡生效。

### Don't:

- **Don't** 把手绘图面坐标、楼高或程序化立面描述为测绘或实景扫描成果。
- **Don't** 擅自把地图上方命名为经过地理校准的正北。
- **Don't** 用新的品牌配色、网络字体或大面积装饰替换原雏形的导览语言。
- **Don't** 为扩大面板而长期遮挡校园主体，或把目录改成页面级滚动。
- **Don't** 默认开启自转，或把支持 Pointer Lock 的要求隐藏起来。

### 时间与天气面板

沿用目录的米白底、深绿文字、9px 圆角和已有按钮状态色，面板按需展开，与建筑目录互斥。时间使用 23px / 700 字重、等宽数字（tabular-nums），其余操作保持现有中文字体栈；使用原生滑块、选择框和复选框，保留键盘入口与焦点环。手机打开面板时收起建筑详情，短屏允许面板内部滚动，避免遮挡底部控制栏。视觉效果使用既有场景材质和日光体系；只增加环境状态，不改变品牌界面。天气与昼夜是用户设定的场景模拟。

### 主楼与中轴线

主楼采用照片中的浅灰白立面 `#e1e5dc`、白色檐口 `#f0eee0`、凹部 `#b8c4bd`、深绿窗格 `#365b50`，不用原先通用楼宇的坡屋顶。主楼正面朝向南门，两翼围合前庭；弧形柱廊、校训石和南门沿同一局部轴坐标定位。近景只显示主楼自身标注，避免背景标牌覆盖立面。详情里的视角切换沿用现有深绿描边按钮；完整轴线视角保留南门与主楼同时入画。夜景使用轮廓与窗格自发光示意，不宣称与现场灯光参数一致。

后续航拍细化将主楼高宽比收敛、柱廊降低收窄并后移到轴向 58，石移至 111，南门整体统一比例。柱廊采用双排叶饰凹槽柱、灰绿石砌基座（`#9da397` 等相邻色）、暗绿饰板 `#65716a` 与泛水边 `#67756c`，延续场景原有材料语言；UI 沿用已有按钮、面板和焦点样式。手机柱廊近景从中轴步道取景，桌面为侧向构件近景。照片未提供可靠测量尺寸，详细解释见 MAIN-DETAIL.md。
