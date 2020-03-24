// 検証のために手元から画像アップロードをするスクリプト
// 実行例: `npm bin`/ts-node src/client.ts https://XXX.execute-api.ap-northeast-1.amazonaws.com/Prod/upload/ src/__tests__/150x150.png

import axios from 'axios';
import fs from 'fs';

const imageFilePath = process.argv[3];
const image = fs.readFileSync(imageFilePath);
axios.post(process.argv[2], {
    id: imageFilePath, // 手抜きでimageFilePathそのまま送ってるけど、そういうことをするとS3に配置された時に.png.pngとかになってしまうのでやめて欲しい。uuid short的なものを入れるのが良さそう
    title: imageFilePath,
    tags: ['タグ1', 'タグ2'],
    link: 'https://www.example.com/',
    image: image.toString('base64'),
}).then((ret) => {
    console.log('Success', ret);
}).catch((err) => {
    console.log('Error', err);
})
