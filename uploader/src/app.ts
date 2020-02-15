import AWS from 'aws-sdk';
import FileType from 'file-type';
import uuid from 'uuid';

export function lambdaHandler (event:any, context:any, callback:Function) {
    const json = JSON.parse(event.body);

    /* 画像データをS3へ配置する */
    // 参考: https://docs.aws.amazon.com/ja_jp/sdk-for-javascript/v2/developer-guide/using-promises.html
    // 参考: https://qiita.com/niusounds/items/9be50e9d8538db052275
    // 参考: https://github.com/shimobayashi/vimage/blob/master/vimage.rb#L59
    const s3 = new AWS.S3();
    const image = Buffer.from(json.image, 'base64');
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
        return s3.putObject(params).promise()
    }).then((data) => {
        console.log('Success', data);

        /* メタデータをDynamoDBへ記録する */
        //XXX

        callback(null, {
            'statusCode': 200,
            'body': JSON.stringify({
                message: 'Succeed!',
            })
        });
    }).catch((err) => {
        console.log('Error', err);

        callback(err, {
            'statusCode': 500,
            'body': JSON.stringify({
                message: err,
            })
        });
    });
}