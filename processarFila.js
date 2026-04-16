const { app } = require('@azure/functions');
const sql = require('mssql');

app.storageQueue('processarFila', {
    queueName: 'fila-recibos',
    connection: 'AzureWebJobsStorage',
    handler: async (message, context) => {

        context.log(`Mensagem recebida da fila: ${message}`);

        try {
            const pool = await sql.connect(process.env.SqlConnectionString);

            await pool.request()
                .input('total', sql.NVarChar, message)
                .query('INSERT INTO RECIBO (TOTAL) VALUES (@total)');

            context.log(`Total ${message} inserido no banco com sucesso`);
            await pool.close();

        } catch (err) {
            context.log(`Erro ao inserir no banco: ${err.message}`);
            throw err;
        }
    }
});
