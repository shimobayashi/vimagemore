import AWS from 'aws-sdk';

export function lambdaHandler (event:any, context:any, callback:Function) {
    /* 画像データをS3へ配置する */
    // 参考: https://docs.aws.amazon.com/ja_jp/sdk-for-javascript/v2/developer-guide/using-promises.html
    // 参考: https://qiita.com/niusounds/items/9be50e9d8538db052275
    // 参考: https://github.com/shimobayashi/vimage/blob/master/vimage.rb#L59
    //XXX event.bodyにJSON文字列がPOSTされてきてそいつをparseして処理する感じにすると楽？
    const s3 = new AWS.S3();
    const params:AWS.S3.Types.PutObjectRequest = {
        Bucket: process.env.VIMAGEMORE_BUCKET_NAME || '',
        Key: 'image/test.txt', //XXX なんかいい感じに決める
        ContentType: 'text/plain', //XXX https://dev.classmethod.jp/server-side/node-js-server-side/node-js-get-file-extension-and-mime-type/
        Body: 'this is test', //XXX busboyを使って画像を読み込む→なんかめんどそうなのでJSONをPOSTされる想定にすると良い気がしてきた
    };
    s3.putObject(params).promise().then((data) => {
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
    })
}