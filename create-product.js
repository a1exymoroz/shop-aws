'use strict';

const {Client} = require('pg');

const {PG_HOST, PG_PORT, PG_DATABASE, PG_USERNAME, PG_PASSWORD} = process.env;

const dbOptions = {
    host: PG_HOST,
    port: PG_PORT,
    "database": PG_DATABASE,
    user: PG_USERNAME,
    password: PG_PASSWORD
}

module.exports.invoke = async (event) => {
    let eventBody = event.body;
    if (typeof eventBody === 'string') {
        eventBody = JSON.parse(event.body);
    }
    const {title, description, price, count} =  eventBody;

    const client = new Client(dbOptions);
    await client.connect();
    try {
        const {rows} = await client.query(`insert into products (title, description, price) values ('${title}', '${description}', ${price}) returning id`);
        const id = rows[0].id;
        await client.query(`insert into stocks (count, product_id) values (${count}, '${id}')`);
        const {rows: data} = await client.query(`select * from products as p inner join stocks as s on p.id = s.product_id where p.id = '${id}'`);
        return {
            statusCode: 200,
            body: JSON.stringify(data[0]),
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
