import axios from 'axios';
import fs from 'fs';

const image = fs.readFileSync(process.argv[3]);
axios.post(process.argv[2], {
    image: image.toString('base64'),
}).then((ret) => {
    console.log('Success', ret);
}).catch((err) => {
    console.log('Error', err);
})
