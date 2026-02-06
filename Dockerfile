FROM node:20-alpine

WORKDIR /app

# 依存関係のインストール用にpackage*.jsonをコピー
COPY package*.json ./

RUN npm install

# ソースコードはボリュームマウントで管理
# COPY . .

EXPOSE 4000

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "4000"]
