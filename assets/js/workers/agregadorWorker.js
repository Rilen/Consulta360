self.addEventListener('message', function(e) {
    const data = e.data.payload;
    const cacheKey = e.data.cacheKey;

    try {
        const cpfMap = {};
        for (const item of data) {
            const cpf = item.cpf || item.CPF || item.Cpf || item.matricula || 'INDEFINIDO';
            if (!cpfMap[cpf]) {
                cpfMap[cpf] = { ...item, vinculos: [item] }; 
            } else {
                cpfMap[cpf].vinculos.push(item);
                ['bruto', 'liquido', 'desconto', 'valor'].forEach(prop => {
                    if (item[prop] !== undefined && !isNaN(Number(item[prop]))) {
                        cpfMap[cpf][prop] = (Number(cpfMap[cpf][prop]) || 0) + Number(item[prop]);
                    }
                });
            }
        }
        const agregada = Object.values(cpfMap);
        self.postMessage({ success: true, cacheKey: cacheKey, agregada: agregada });
    } catch (err) {
        self.postMessage({ success: false, cacheKey: cacheKey, error: err.message });
    }
});
