#!/usr/bin/env bash

cp -f ./scripts/config/wechat.json ./iconfont.json
ts-node src/commands/createWechatIcon.ts

cp -f ./scripts/config/alipay.json ./iconfont.json
ts-node src/commands/createAlipayIcon.ts
