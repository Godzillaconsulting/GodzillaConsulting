import pg from 'pg';

const pool = new pg.Pool({
    connectionString: "postgresql://postgres:godzilla2026@localhost:5432/godzilla",
});

async function run() {
    try {
        const pkgIds = ['paquete-expansion', 'paquete-elite', 'paquete-control-ia', 'paquete-posicionamiento-social'];
        
        for (const id of pkgIds) {
            const res = await pool.query("SELECT draft_data, published_data FROM site_nodes WHERE id = $1", [id]);
            if (res.rows.length === 0) continue;
            
            let { draft_data, published_data } = res.rows[0];
            
            // Function to strip generic placeholders
            const scrubData = (data) => {
                if (!data) return data;
                
                if (data.heroTitle === 'NOMBRE DEL PAQUETE') delete data.heroTitle;
                if (data.planPrice === '$0,000') delete data.planPrice;
                if (data.planPeriod === 'al mes') delete data.planPeriod;
                if (data.planTarget === 'Ideal para la fase actual de tu negocio') delete data.planTarget;
                if (data.heroTopText === 'CÓMO TE AYUDAREMOS') delete data.heroTopText;
                if (data.guaranteeText === 'Si no cumplimos los objetivos, el siguiente mes es gratis.') delete data.guaranteeText;
                if (data.guaranteeBadge === '100% Garantizado') delete data.guaranteeBadge;
                if (data.guaranteeTitle === 'GARANTÍA DE RESULTADOS') delete data.guaranteeTitle;
                if (data.heroDisclaimer === '*Sujeto a contrato de servicios.') delete data.heroDisclaimer;
                
                if (Array.isArray(data.planFeaturesExtended)) {
                    if (data.planFeaturesExtended.length > 0 && data.planFeaturesExtended[0].title === 'Característica 1') {
                        delete data.planFeaturesExtended;
                    }
                }
                return data;
            };

            draft_data = scrubData(draft_data);
            published_data = scrubData(published_data);

            await pool.query(
                "UPDATE site_nodes SET draft_data = $1, published_data = $2 WHERE id = $3",
                [draft_data, published_data, id]
            );
            console.log(`Scrubbed placeholders for ${id}`);
        }
        
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
run();
