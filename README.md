# 求职工作台 · Public Demo

这是一个可独立运行、只包含虚拟数据的公开演示工程。候选人、公司、岗位、
投递进度、面试素材和结果数据均为虚构。

## 演示入口

- `/`：林澈的虚拟求职工作台；
- `/?portfolio=workspace`：林澈的虚拟求职工作台；
- `/?portfolio=onboarding`：从虚拟简历开始重播首次 Onboarding；
- 任何未知 query 值：回落到虚拟求职工作台。

演示不会调用真实岗位源、连接登录账号、读取原工作台的本地存储，或持久化
用户上传的内容。

## 本地运行

```bash
npm install
npm run dev
```

## 验证

```bash
npm run lint
npm test
```
