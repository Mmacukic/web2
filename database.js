const { Client } = require('pg');

const client = new Client({
	user: 'web2auth_pw37_user',
	password: 'YmSMJWYCxBNB7H2mEjnAlEEMDn3N9uXm',
	database: 'web2auth_pw37',
	host: 'dpg-csehnebtq21c738c6fc0-a',
	port: '5432',
});
client
	.connect()
	.then(() => {
		console.log('Connected to PostgreSQL database');
	})
	.catch((err) => {
		console.error('Error connecting to PostgreSQL database', err);
	});

module.exports = {
  query: (text, params) => client.query(text, params),
};
