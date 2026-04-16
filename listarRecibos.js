const { app } = require('@azure/functions');
const sql = require('mssql');

app.http('listarRecibos', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {

        try {
            const pool = await sql.connect(process.env.SqlConnectionString);
            const result = await pool.request().query('SELECT * FROM RECIBO');
            await pool.close();

            return {
                status: 200,
                jsonBody: { recibos: result.recordset }
            };

        } catch (err) {
            return {
                status: 500,
                jsonBody: { erro: err.message }
            };
        }
    }
});
