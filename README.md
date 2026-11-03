# 吃什么

校园食堂点评推荐工具，以北大家园食堂二层为例，帮学生发现新菜、避开踩雷窗口。

**在线访问：** https://hantarita.github.io/chishenme/

档口（“北京味道”除外）、菜品和评论都是虚构的演示数据，布局为示意。写下的点评只保存在当前浏览器里。

## 功能

- 3D 食堂空间：每个档口都有招牌，颜色按评分从白色（0 分）变为深红（5 分）
- 档口详情：综合评分、推荐菜、评价最低的菜、学生点评，可以打分和写评论
- 右侧栏：综合榜 Top 5、菜品上新、全部档口，每道菜都标注辣或不辣
- 转盘：从不同档口随机抽菜，可筛选辣度
- 手机端适配；不支持 WebGL 时退回 2D 平面图

## 开发

```bash
npm install
npm run dev     # 本地开发
npm test        # 单元测试
npm run e2e     # 端到端测试（首次需要 npx playwright install chromium）
npm run seed    # 重新生成演示数据
npm run build   # 构建
```

产品规则见 [docs/SPEC.md](docs/SPEC.md)。GitHub Pages 没有服务器，所以 `src/api/mockServer.ts` 在浏览器里模拟后端；UI 只依赖 `src/api/client.ts` 的接口，接入真实后端时替换这一层即可。
