function parsePages(pagesString) {
    if (!pagesString) {
        return null;
    }
    const pages = [];
    const ranges = pagesString.split(',');
    ranges.forEach(range => {
        if (range.includes('-')) {
            const [start, end] = range.split('-').map(Number);
            for (let i = start; i <= end; i++) {
                pages.push(i);
            }
        } else {
            pages.push(Number(range));
        }
    });
    return pages;
}

async function getPdfText(file, pages) {
    const fileReader = new FileReader();
    fileReader.readAsArrayBuffer(file);
    await new Promise(resolve => fileReader.onload = resolve);
    const typedarray = new Uint8Array(fileReader.result);
    const pdf = await pdfjsLib.getDocument(typedarray).promise;
    const result = [];
    if (pages) {
        for (let i = 0; i < pages.length; i++) {
            if (pages[i] >= 1 && pages[i] <= pdf.numPages) {
                const page = await pdf.getPage(pages[i]);
                const textContent = await page.getTextContent();
                let pageText = '';
                textContent.items.forEach(item => {
                    pageText += item.str + ' ';
                });
                result.push(pageText);
            }
        }
    } else {
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            let pageText = '';
            textContent.items.forEach(item => {
                pageText += item.str + ' ';
            });
            result.push(pageText);
        }
    }
    return result;
}

document.getElementById('pdf-form').addEventListener('submit', async event => {
    event.preventDefault();

    // Mostrar o elemento de carregamento
    document.getElementById('loading').style.display = 'block';

    const pdf1 = document.getElementById('pdf1').files[0];
    const pdf2 = document.getElementById('pdf2').files[0];
    const pagesString = document.getElementById('pages').value;

    if (!pdf1 || !pdf2) {
        alert('Por favor, selecione dois arquivos PDF para comparar.');
        // Ocultar o elemento de carregamento
        document.getElementById('loading').style.display = 'none';
        return;
    }

    const pages = parsePages(pagesString);

    const text1 = await getPdfText(pdf1, pages);
    const text2 = await getPdfText(pdf2, pages);

    let resultHTML = '<ul class="list-group list-group-flush">';
    let identical = true;
    for (let i = 0; i < text1.length; i++) {
        const differences = Diff.diffWords(text1[i], text2[i]);
        if (differences.length !== 1 || differences[0].added || differences[0].removed) {
            identical = false;
            resultHTML += `<li class="list-group-item"><h5>Página ${i + 1}</h5></li>`;
            differences.forEach(part => {
                if (part.added || part.removed) {
                    const label = part.added ? 'Texto novo' : 'Texto antigo';
                    resultHTML += `<li class="list-group-item">${label}: `;
                    if (part.added) {
                        resultHTML += `<ins style="color: green">${part.value}</ins>`;
                    } else {
                        resultHTML += `<del style="color: red; text-decoration: line-through;">${part.value}</del>`;
                    }
                    resultHTML += '</li>';
                }
            });
        }
    }
    resultHTML += '</ul>';

    if (identical) {
        document.getElementById('result').innerHTML = '<div class="alert alert-primary align-items-center text-center" role="alert">Os arquivos (PDF) são idênticos.</div>';
    } else {
        document.getElementById('result').innerHTML = '<div class="alert alert-warning align-items-center" role="alert">Os arquivos (PDF) são diferentes. Confira abaixo o texto original com suas respectivas alterações.</div>' + resultHTML;
    }

    // Ocultar o elemento de carregamento
    document.getElementById('loading').style.display = 'none';

    // Resetar o formulário
    document.getElementById('pdf-form').reset();
});