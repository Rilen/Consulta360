const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs-extra');
const csv = require('csv-parser');
const iconv = require('iconv-lite');

const BASE_URL = 'https://webapp1-riodasostras.cidade360.cloud/pronimtb';
const OUTPUT_DIR = path.join(__dirname, '..', 'data'); // Saving right into the project's data folder
const DOWNLOAD_TEMP = path.join(__dirname, 'temp_downloads');

async function waitForDownload(downloadPath, timeoutMs = 30000) {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        const interval = setInterval(() => {
            if (Date.now() - start > timeoutMs) {
                clearInterval(interval);
                reject(new Error('Timeout aguardando download'));
                return;
            }
            const files = fs.readdirSync(downloadPath);
            // Ignore .crdownload files
            const finishedFile = files.find(f => !f.endsWith('.crdownload') && f !== '.keep');
            if (finishedFile) {
                clearInterval(interval);
                resolve(path.join(downloadPath, finishedFile));
            }
        }, 500);
    });
}

async function scrapeExportPage(page, url, outputPath, parserCallback) {
    console.log(`[+] Acessando ${url}...`);
    await fs.emptyDir(DOWNLOAD_TEMP);
    
    // Set download behavior
    const client = await page.createCDPSession();
    await client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: DOWNLOAD_TEMP,
    });

    await page.goto(url, { waitUntil: 'networkidle2' });

    console.log('    Localizando botão de CSV...');
    // Procurar botão/link/imagem que contenha "csv"
    const csvButton = await page.evaluateHandle(() => {
        const elements = Array.from(document.querySelectorAll('a, input, button, img'));
        return elements.find(el => {
            const txt = (el.textContent || el.title || el.alt || el.src || el.value || '').toLowerCase();
            return txt.includes('csv');
        });
    });

    if (!csvButton) {
        throw new Error('Botão CSV não encontrado na página: ' + url);
    }

    console.log('    Clicando no botão de CSV...');
    await csvButton.click();

    console.log('    Aguardando download...');
    const downloadedFile = await waitForDownload(DOWNLOAD_TEMP);
    console.log(`    Download concluído: ${downloadedFile}`);

    console.log('    Fazendo parsing do CSV...');
    const results = [];
    return new Promise((resolve, reject) => {
        fs.createReadStream(downloadedFile)
            .pipe(iconv.decodeStream('iso-8859-1')) // TransparênciaBR normalmente usa ISO-8859-1
            .pipe(csv({ separator: ';' })) // Padrão brasileiro
            .on('data', (data) => {
                if (parserCallback) {
                    const parsed = parserCallback(data);
                    if (parsed) results.push(parsed);
                } else {
                    results.push(data);
                }
            })
            .on('end', async () => {
                await fs.ensureDir(OUTPUT_DIR);
                await fs.writeJson(outputPath, results, { spaces: 2 });
                console.log(`[OK] Dados salvos em ${outputPath} (${results.length} registros)`);
                resolve();
            })
            .on('error', reject);
    });
}

// ================== PARSERS ==================

function parseFolha(data) {
    // Mapeamento das colunas do CSV da Folha para as chaves da aplicação
    // Ajustar os nomes (data['NOME DA COLUNA CSV']) conforme o arquivo gerado
    return {
        Matricula: data['Matrícula'] || data['Matricula'] || '',
        Nome: data['Nome'] || data['Servidor'] || '',
        CargoFuncao: data['Cargo'] || data['Função'] || '',
        Lotacao: data['Lotação'] || data['Secretaria'] || '',
        VinculoEmpregaticio: data['Vínculo'] || data['Vinculo'] || '',
        Entidade: 'PM RIO DAS OSTRAS',
        MesReferencia: data['Mês/Ano'] || data['MesReferencia'] || '01/2025',
        Liquido: parseFloat((data['Líquido'] || data['Valor Líquido'] || '0').replace(',', '.')) || 0,
        Bruto: parseFloat((data['Bruto'] || data['Valor Bruto'] || '0').replace(',', '.')) || 0
    };
}

// =============================================

async function main() {
    console.log('Iniciando Extrator TransparênciaBR...');
    
    // Assegura diretórios
    await fs.ensureDir(OUTPUT_DIR);
    await fs.ensureDir(DOWNLOAD_TEMP);
    
    const browser = await puppeteer.launch({ 
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    
    const page = await browser.newPage();
    
    try {
        // Exemplo: Folha de Pagamento
        await scrapeExportPage(
            page, 
            `${BASE_URL}/index.asp?acao=10&item=8`, 
            path.join(OUTPUT_DIR, 'FolhaPagamento_PM RIO DAS OSTRAS_2025-01.json'),
            parseFolha
        );

        // Você pode adicionar as rotas de Receitas e Despesas aqui:
        // await scrapeExportPage(page, `${BASE_URL}/index.asp?acao=10&item=3`, path.join(OUTPUT_DIR, 'receitas_2025_PM RIO DAS OSTRAS.json'), null);
        // await scrapeExportPage(page, `${BASE_URL}/index.asp?acao=10&item=4`, path.join(OUTPUT_DIR, 'despesas_2025_PM RIO DAS OSTRAS.json'), null);

    } catch (err) {
        console.error('[ERRO] Falha na extração:', err.message);
    } finally {
        await browser.close();
        await fs.emptyDir(DOWNLOAD_TEMP);
        console.log('Finalizado.');
    }
}

main();
