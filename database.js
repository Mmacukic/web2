const { Client } = require('pg');

const client = new Client({
	user: 'web2auth_pw37_user',
	password: 'YmSMJWYCxBNB7H2mEjnAlEEMDn3N9uXm',
	host: 'postgresql://web2auth_pw37_user:YmSMJWYCxBNB7H2mEjnAlEEMDn3N9uXm@dpg-csehnebtq21c738c6fc0-a.frankfurt-postgres.render.com/web2auth_pw37',
	port: '5432',
	database: 'web2auth_pw37',
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
