'use strict';

const AWS = require('aws-sdk');
const csvParser = require("csv-parser");
const BUCKET = 'rss-2022-uploaded';

module.exports =
    {
        importProductsFile:   async (event) => {

            const s3 = new AWS.S3({ region: 'eu-west-1' }); // inside the handler to mock in tests

            if (!event.queryStringParameters?.name) {
                const response = {
                    headers: {'Access-Control-Allow-Origin': '*'},
                    statusCode: 400,
                    body: JSON.stringify({
                        error: { message: 'No required query parameters' }
                    }),
                };
                console.error(event)
                return response;
            }

            try {
                const { name: filename } = event.queryStringParameters;
                const params = {
                    Bucket: BUCKET,
                    Key: `uploaded/${filename}`,
                    Expires: 900,
                    ContentType: 'text/csv',
                };
                const signedUrl = await s3.getSignedUrlPromise('putObject', params);
                const response = {
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                        'Content-Type': 'text/plain',
                    },
                    statusCode: 200,
                    body: signedUrl,
                }
                console.log(event)
                return response;
            } catch(error) {
                const response = {
                    headers: {
                        'Access-Control-Allow-Origin': '*'
                    },
                    statusCode: 500,
                    body: JSON.stringify({
                        error: { message: 'Server error' }
                    }),
                };
                console.error(event)
                return response;
            }

        },
        importFileParser: async(event) => {
            const s3 = new AWS.S3({ region: 'eu-west-1' });

            return new Promise((resolve, reject) => {
                const handleError = (error) => {
                    console.error(error);
                    reject({
                        headers: {
                            'Access-Control-Allow-Origin': '*'
                        },
                        error: { message: error.message }
                    });
                };

                for (const record of event.Records) {
                    const s3ObjectKey = record.s3.object.key;
                    const params = {
                        Bucket: BUCKET,
                        Key: s3ObjectKey,
                    };
                    const s3Stream = s3.getObject(params).createReadStream();
                    console.log(`Parsing of ${s3ObjectKey} is started`);
                    s3Stream
                        .on('error', (error) => { handleError(error); })
                        .pipe(csvParser())
                        .on('data', (data) => {
                            const parsedData = Object.entries(data).map(([key, value]) => `${key}:${value}`).join(';');
                            console.log(`Parsed ${parsedData}`);
                        })
                        .on('end', () => {
                            console.log(`${s3ObjectKey} is parsed successfully`);

                            (async () => {
                                await s3.copyObject({
                                    Bucket: BUCKET,
                                    CopySource: `${BUCKET}/${s3ObjectKey}`,
                                    Key: s3ObjectKey.replace('uploaded', 'parsed'),
                                }).promise();
                                console.log(`${s3ObjectKey} is successfully copied to parsed`);

                                await s3.deleteObject({
                                    Bucket: BUCKET,
                                    Key: s3ObjectKey,
                                }).promise();
                                console.log(`${s3ObjectKey} is successfully deleted from uploaded`);

                                resolve({
                                    statusCode: 202,
                                });
                            })();
                        })
                        .on('error', (error) =>  handleError(error));
                }
            });
        }
    }

