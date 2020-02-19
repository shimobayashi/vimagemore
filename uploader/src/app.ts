import AWS from 'aws-sdk';
import FileType from 'file-type';

export async function lambdaHandler (event:any) {
    const json = JSON.parse(event.body);
    if (!json.key) {
        throw new Error('json.key is not found');
    }
    const image = Buffer.from(json.image, 'base64');

    var path = '';
    var contentType = '';
    return FileType.fromBuffer(image).then((filetype) => {
        if (filetype === undefined) {
            throw new Error('filetype is not detected');
        }
        path = `images/${json.key}.${filetype.ext}`;
        contentType = filetype.mime;

        /* メタデータをDynamoDBへ記録する */
        // 参考: https://docs.aws.amazon.com/ja_jp/amazondynamodb/latest/developerguide/GettingStarted.NodeJs.03.html#GettingStarted.NodeJs.03.01
        const docClient = new AWS.DynamoDB.DocumentClient();
        const epoch = Math.floor(Date.now() / 1000);
        //TODO ConditionalCheckFailedExceptionが返ってきたら500以外を返したいような気がする
        return docClient.put({
            TableName: process.env.IMAGE_TABLE_NAME ?? '',
            Item: {
                Key: json.key,
                Path: path,
                Title: json.title,
                CreatedAt: epoch,
                UpdatedAt: epoch,
            },
            Expected: {
                Key: {
                    Exists: false,
                },
            },
        }).promise();
    }).then(() => {
        /* 画像データをS3へ配置する */
        // 参考: https://docs.aws.amazon.com/ja_jp/lambda/latest/dg/nodejs-prog-model-handler.html#nodejs-handler-async
        // 参考: https://github.com/shimobayashi/vimage/blob/master/vimage.rb#L59
        const params:AWS.S3.Types.PutObjectRequest = {
            Bucket: process.env.VIMAGEMORE_BUCKET_NAME ?? '',
            Key: path,
            ContentType: contentType,
            Body: image,
            ACL: 'public-read',
        };
        const s3 = new AWS.S3();
        return s3.putObject(params).promise();
    }).then(() => {
        return {
            statusCode: 200,
        };
    });
    //TODO catchしてS3とDynamoDBからデータ消すようにしたら丁寧な気がする
}