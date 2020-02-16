import AWS from 'aws-sdk';
import FileType from 'file-type';
import uuid from 'uuid';

export async function lambdaHandler (event:any) {
    /* 画像データをS3へ配置する */
    // 参考: https://docs.aws.amazon.com/ja_jp/lambda/latest/dg/nodejs-prog-model-handler.html#nodejs-handler-async
    // 参考: https://github.com/shimobayashi/vimage/blob/master/vimage.rb#L59
    const json = JSON.parse(event.body);
    const image = Buffer.from(json.image, 'base64');
    const promise = new Promise((resolve, reject) => {
        FileType.fromBuffer(image).then((filetype) => {
            if (filetype === undefined) {
                throw new Error('filetype is not detected');
            }

            const params:AWS.S3.Types.PutObjectRequest = {
                Bucket: process.env.VIMAGEMORE_BUCKET_NAME || '',
                Key: `images/${uuid.v4()}.${filetype.ext}`,
                ContentType: filetype.mime,
                Body: image,
                ACL: 'public-read',
            };
            const s3 = new AWS.S3();
            return s3.putObject(params).promise();
        }).then((data) => {
            /* メタデータをDynamoDBへ記録する */
            //XXX

            resolve({
                statusCode: 200
            });
        }).catch((error) => {
            reject(error);
        });
    });
    return promise;
}