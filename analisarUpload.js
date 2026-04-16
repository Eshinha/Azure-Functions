const { app, output } = require('@azure/functions');
const multipart = require('parse-multipart-data');
const axios = require('axios');

const CHAVE_API_KEY = "59j3nVgyVrxtSN2zYIEJKXRVDJy2OXCQzpnNaMyZOCMFEzOQ3Q1VJQQJ99CDACrIdLPXJ3w3AAALACOGUFCF";

const queueOutput = output.storageQueue({
    queueName: 'fila-recibos',
    connection: 'AzureWebJobsStorage'
});

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

app.http('analisarUpload', {
    methods: ['POST'],
    authLevel: 'anonymous',
    extraOutputs: [queueOutput],
    handler: async (request, context) => {

        try {

            // Pega body como buffer
            const bodyBuffer = Buffer.from(await request.arrayBuffer());

            // Extrai boundary do multipart
            const contentType = request.headers.get('content-type');
            const boundary = contentType.split('boundary=')[1];

            // Parse multipart
            const parts = multipart.parse(bodyBuffer, boundary);

            if (!parts.length) {
                return {
                    status: 400,
                    jsonBody: { erro: "Nenhum arquivo enviado." }
                };
            }

            const arquivo = parts[0];

            const endpoint = "https://brazilsouth.api.cognitive.microsoft.com/";

            context.log('Enviando para processamento');
            const response = await axios.post(
                `${endpoint}documentintelligence/documentModels/prebuilt-receipt:analyze?api-version=2024-11-30`,
                arquivo.data,
                {
                    headers: {
                        'Ocp-Apim-Subscription-Key': CHAVE_API_KEY,
                        'Content-Type': 'application/octet-stream'
                    }
                }
            );

            context.log(`Imagem em processamento: ${response.headers['operation-location']}`);

            context.log('Obtendo o resultado');

            let analise = await axios.get(
                response.headers['operation-location'],
                {
                    headers: {
                        'Ocp-Apim-Subscription-Key': CHAVE_API_KEY
                    }
                }
            );

            while (analise.data.status === 'running') {
                analise = await axios.get(
                    response.headers['operation-location'],
                    {
                        headers: {
                            'Ocp-Apim-Subscription-Key': CHAVE_API_KEY
                        }
                    }
                );

                context.log(analise.data.status);

                await sleep(5000);
            }

            context.log(analise.data.analyzeResult.documents[0]);

            const total = analise.data.analyzeResult.documents[0].fields.Total;
            const valorTotal = total.content || total.valueNumber?.toString() || "0";
            context.extraOutputs.set(queueOutput, valorTotal);
            context.log(`Total enviado pra fila: ${valorTotal}`);

            return {
                status: 200,
                jsonBody: {
                    resultado: analise.data.analyzeResult.documents[0].fields,
                    totalEnviado: valorTotal
                }
            };

        } catch (err) {

            return {
                status: 500,
                jsonBody: {
                    erro: err.message
                }
            };
        }
    }
});
