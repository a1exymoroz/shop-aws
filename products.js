'use strict';

const { Client } = require('pg');

const {PG_HOST, PG_PORT, PG_DATABASE, PG_USERNAME, PG_PASSWORD} = process.env;

const dbOptions = {
  host: PG_HOST,
  port: PG_PORT,
  "database": PG_DATABASE,
  user: PG_USERNAME,
  password: PG_PASSWORD
}

module.exports.invoke = async () => {
  const client = new Client(dbOptions);
  await client.connect();

  try {
    const {rows: data} = await client.query(`select * from products as p inner join stocks as s on p.id = s.product_id`);
    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify(err),
    };
  } finally {
    client.end()
  }


};
