import AWS from 'aws-sdk';
import FileType from 'file-type';

export async function lambdaHandler (event:any) {
    const json: {
        id: string;
        title: string;
        tags: string[];
        link: string | null;
        image: string;
    } = JSON.parse(event.body);
    const image = Buffer.from(json.image, 'base64');

    let path = '';
    let contentType = '';
    const docClient = new AWS.DynamoDB.DocumentClient();
    return FileType.fromBuffer(image).then((filetype) => {
        if (filetype === undefined) {
            throw new Error('filetype is not detected');
        }
        // json.idにスラッシュが入っているとS3での見え方が微妙なのでハッシュにしたりしても良いかも知れない？
        path = `images/${json.id}.${filetype.ext}`;
        contentType = filetype.mime;

        /* 画像のメタデータをDynamoDBへ記録する */
        // 参考: https://docs.aws.amazon.com/ja_jp/amazondynamodb/latest/developerguide/GettingStarted.NodeJs.03.html#GettingStarted.NodeJs.03.01
        const epoch = Math.floor(Date.now() / 1000);
        //TODO ConditionalCheckFailedExceptionが返ってきたら500以外を返したいような気がする
        return docClient.put({
            TableName: process.env.IMAGE_TABLE_NAME ?? '',
            Item: {
                Id: json.id,
                Path: path,
                Title: json.title,
                Tags: json.tags,
                Link: json.link,
                CreatedAt: epoch,
                UpdatedAt: epoch,
            },
            Expected: {
                Id: {
                    Exists: false,
                },
            },
        }).promise();
    }).then(() => {
        /* タグ情報をDynamoDBへ記録する */
        // 参考: https://stackoverflow.com/questions/34951043/is-it-possible-to-combine-if-not-exists-and-list-append-in-update-item
        return Promise.all(
            json.tags.map(tag => {
                return docClient.update({
                    TableName: process.env.IMAGE_TAG_TABLE_NAME ?? '',
                    Key: {
                        Id: tag,
                    },
                    UpdateExpression: 'SET Images = list_append(if_not_exists(Images, :emptyList), :taggedImages)',
                    ExpressionAttributeValues: {
                        ':emptyList': [],
                        ':taggedImages': [json.id],
                    },
                    ReturnValues: 'NONE',
                }).promise()
            })
        )
    }).then(() => {
        /* 画像データをS3へ配置する */
        // 参考: https://docs.aws.amazon.com/ja_jp/lambda/latest/dg/nodejs-prog-model-handler.html#nodejs-handler-async
        // 参考: https://github.com/shimobayashi/vimage/blob/master/vimage.rb#L59
        const params:AWS.S3.Types.PutObjectRequest = {
            Bucket: process.env.BUCKET_NAME ?? '',
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