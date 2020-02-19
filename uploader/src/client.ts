import axios from 'axios';
import fs from 'fs';

const imageFilePath = process.argv[3];
const image = fs.readFileSync(imageFilePath);
axios.post(process.argv[2], {
    key: imageFilePath,
    image: image.toString('base64'),
}).then((ret) => {
    console.log('Success', ret);
}).catch((err) => {
    console.log('Error', err);
})
