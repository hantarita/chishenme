---
name: canteen-frontend
description: 「吃什么」食堂点评项目的前端约定。修改 src/scene 或 src/ui 时使用，包括 3D 大厅、档口招牌、热力色、镜头、详情抽屉、右侧栏、转盘、评论表单、手机端适配和 WebGL 退回，即使用户只说“改一下页面”或“调一下档口”也要使用。
---

# 前端约定

完整规则见 `docs/SPEC.md`。这里只写容易做错的地方。

## 数据
组件通过 `src/store.ts` 取数据，store 再调用 `src/api/client.ts`。不要直接读种子文件或 localStorage，这样以后换成真实后端时 UI 不用改。

## 3D
- 使用 `frameloop="demand"`，动画期间调用 `invalidate()`。笔记本用户大多只是在看页面，不该一直占用 GPU。
- 使用 `flat` 关闭色调映射，否则 0 分不再是纯白，5 分也不够红。
- 重复物件（餐桌、凳子）用 instancedMesh。
- 招牌用 Canvas 2D 绘制成贴图，使用系统中文字体。分数变化时重绘，并释放旧贴图。
- 用 `e.delta` 区分拖动和点击，否则旋转镜头时会误开档口。

## 热力色
颜色只来自 `src/domain/heat.ts`。招牌文字用 `readableTextColor` 选择深浅。UI 的强调色不要用红色系，否则会和热力图混淆。

## 退回和无障碍
- 3D 打不开时要显示 `FloorPlan`（2D 平面图），两者共用同一套颜色和点击逻辑。
- 3D 代码用 `React.lazy` 加载，让右侧栏先显示。
- 菜品出现的所有位置都要用 `SpicyTag` 标注辣度。
- 页面始终要有“演示数据”标注。
