import { createClient } from '@supabase/supabase-js';


const supabaseUrl = 'https://nzumwlptqrwbpenoxrkf.supabase.co';
const supabaseKey = process.env.SUPABASE_API_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  const action = req.query.action;

  if (action === 'biler') {
    const { data, error } = await supabase
      .from('ucp_biler')
      .select('id, vin, model, color, mileage, purchase_date, first_registration, net_invoice_price, co2_emissions, pr_codes');

    if (error) return res.status(500).json({ error: 'Feil ved henting av biler' });
    return res.status(200).json(data);
  }

  else if (action === 'svv_oppdater') {
    const vin = req.query.vin;
    if (!vin || typeof vin !== 'string') {
      return res.status(400).json({ error: 'VIN mangler eller er ugyldig' });
    }

    const apiKey = process.env.SVV_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Mangler SVV API-nøkkel' });

    const url = `https://akfell-datautlevering.atlas.vegvesen.no/enkeltoppslag/kjoretoydata?understellsnummer=${vin}`;

    try {
      const response = await globalThis.fetch(url, {
        method: 'GET',
        headers: {
          'SVV-Authorization': `Apikey ${apiKey}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('SVV API-feil:', errorText);
        return res.status(200).json({ har_svv_data: false });
      }

      const result = await response.json();
      const kjoretoy = result.kjoretoydataListe?.[0] ?? {};
      const godkjenning = kjoretoy.godkjenning?.forstegangsGodkjenning ?? {};
      const tekniskeData = kjoretoy.godkjenning?.tekniskGodkjenning?.tekniskeData ?? {};
      const miljo = tekniskeData?.miljodata?.miljoOgdrivstoffGruppe?.[0] ?? {};
      const utslipp = miljo?.forbrukOgUtslipp?.[0] ?? {};
      const wltp = utslipp?.wltpKjoretoyspesifikk ?? {};
      const vekter = tekniskeData?.vekter ?? {};

const kjennemerke = (
  kjoretoy?.kjennemerke?.[0]?.kjennemerke ||
  kjoretoy?.kjoretoyId?.kjennemerke ||
  null
)?.replace(/\s/g, '') || null;
console.log('Kjennemerke lagres som:', kjennemerke);



      const upsertData = {
        vin,
        kjennemerke,
        co2_vektet_kombinert: wltp.co2VektetKombinert ?? null,
        forbruk_vektet_kombinert: wltp.forbrukVektetKombinert ?? null,
        nedc_co2: wltp.nedcVektetKombinertDrivstoffCo2 ?? null,
        nedc_forbruk: wltp.nedcVektetKombinertDrivstoff ?? null,
        rekkevidde_km: wltp.rekkeviddeKmBlandetkjoring ?? null,
        el_forbruk: wltp.elEnergiforbruk ?? null,
        nox: utslipp?.utslippNOxMgPrKm ?? null,
        egenvekt_minimum: vekter?.egenvektMinimum ?? null,
        forstegang_registrert: godkjenning?.forstegangRegistrertDato ?? null,
        forstegang_registrert_norge: kjoretoy.forstegangsregistrering?.registrertForstegangNorgeDato ?? null,
        sist_oppdatert: new Date().toISOString()
      };
console.log('Oppdaterer/upserter i svv_data:', upsertData);

      const { error: insertError } = await supabase.from('svv_data').upsert(upsertData);
      if (insertError) {
        console.error('Feil ved upsert til svv_data:', insertError);
        return res.status(200).json({ har_svv_data: false });
      }

      const { data: checkData } = await supabase
        .from('svv_data')
        .select('vin')
        .eq('vin', vin)
        .maybeSingle();

      return res.status(200).json({ har_svv_data: !!checkData });
    } catch (err) {
      console.error('Exception ved SVV-oppdatering:', err);
      return res.status(200).json({ har_svv_data: false });
    }
  }


  else if (action === 'tuv') {
    const vin = req.query.vin;
    if (!vin) return res.status(400).json({ error: 'VIN mangler' });

    const filePath = `${vin}_tuv_report.pdf`;
    const { data, error } = await supabase
      .storage
      .from('takster')
      .createSignedUrl(filePath, 3600);

    if (error || !data?.signedUrl) {
      return res.status(500).json({ error: 'Feil ved generering av TÜV-link' });
    }

    return res.status(200).json({ signedUrl: data.signedUrl });
  }

  else if (action === 'farge') {
    const fargeTysk = req.query.farge_tysk;
    if (!fargeTysk) return res.status(400).json({ error: 'Mangler farge_tysk' });

    const { data, error } = await supabase
      .from('farger')
      .select('farge_norsk')
      .eq('farge_tysk', fargeTysk)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Fant ikke norsk farge' });
    return res.status(200).json({ farge_norsk: data.farge_norsk });
  }

  else if (action === 'arsmodell') {
    const kode = req.query.kode;
    if (!kode) return res.status(400).json({ error: 'Manglende kode' });

    const { data, error } = await supabase
      .from('arsmodeller')
      .select('aar')
      .eq('kode', kode)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Fant ikke arsmodell' });
    return res.status(200).json({ aar: data.aar });
  }

else if (action === 'svv_data') {
  const vin = req.query.vin;
  if (!vin) return res.status(400).json({ error: 'VIN mangler' });

  const { data } = await supabase
    .from('svv_data')
    .select('vin, kjennemerke')
    .eq('vin', vin)
    .maybeSingle();

  return res.status(200).json({
    har_svv_data: !!data,
    har_kjennemerke: !!data?.kjennemerke
  });
}


  else if (action === 'bilvisning') {
    const vin = req.query.vin;
    if (!vin) return res.status(400).json({ error: 'VIN mangler' });

    const identifikator = vin.substring(6, 8).trim();

    const { data: biler, error: bilError } = await supabase
      .from('ucp_biler')
      .select('*')
      .eq('vin', vin);

    if (bilError || !biler || biler.length === 0) return res.status(404).json({ error: 'Bil ikke funnet' });
    const bil = biler[0];

    let prCodes = bil.pr_codes;
    if (typeof prCodes === 'string') prCodes = prCodes.split(',').map(code => code.trim());

    const arsmodellKode = vin[9]?.toUpperCase();
    const { data: arsmodellData } = await supabase
      .from('arsmodeller')
      .select('aar')
      .eq('kode', arsmodellKode)
      .single();

    if (!arsmodellData) return res.status(404).json({ error: 'Fant ikke årsmodell for VIN' });
    const modelYear = arsmodellData.aar;

    const { data: bilmodellKode } = await supabase
      .from('bilmodell_kode')
      .select('bilmodell, merke')
      .ilike('identifikator', identifikator)
      .limit(1)
      .maybeSingle();

    if (!bilmodellKode) return res.status(404).json({ error: 'Bilmodell ikke funnet for VIN', identifikator });
    const { bilmodell, merke } = bilmodellKode;

    const { data: prCodeData, error: prError } = await supabase
      .from('pr_koder')
      .select('pr_code, desc_norwegian, desc_german, uc_valuation, model_year, brand, model_base')
      .in('pr_code', prCodes)
      .eq('model_year', modelYear.toString())
      .eq('brand', merke)
      .eq('model_base', bilmodell);

    if (prError) return res.status(200).json({ bil, prCodes: [] });

    const prCodesWithData = prCodeData.map(row => ({
      prCode: row.pr_code,
      desc: row.desc_norwegian || row.desc_german || 'Beskrivelse mangler',
      valuation: row.uc_valuation || 0
    })).sort((a, b) => (b.valuation || 0) - (a.valuation || 0));

    return res.status(200).json({ bil, prCodes: prCodesWithData });
  }

  else if (action === 'bilder') {
    const vin = req.query.vin;
    if (!vin) return res.status(400).json({ error: 'VIN mangler' });

    try {
      const response = await fetch(`https://newcars-media.cdn.semler.io/images/${vin}`);
      if (!response.ok) throw new Error('Klarte ikke hente bilder');
      const data = await response.json();

      const filtered = Object.entries(data)
        .filter(([_, url]) => url)
        .map(([label, url]) => ({ label, url }));

      return res.status(200).json({ bilder: filtered });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
  
  else if (action === 'alle_farger') {
    const { data, error } = await supabase
      .from('farger')
      .select('farge_tysk, farge_norsk')

    if (error) return res.status(500).json({ error: 'Feil ved henting av fargetabell' })
    return res.status(200).json(data)
  }

else if (action === 'svv_data_full') {
  const vin = req.query.vin;
  if (!vin) return res.status(400).json({ error: 'VIN mangler' });

  const { data, error } = await supabase
    .from('svv_data')
    .select('*')
    .eq('vin', vin)
    .maybeSingle();

  if (error || !data) return res.status(404).json({ error: 'Fant ikke SVV-data' });
  return res.status(200).json(data);
}

else if (action === 'beregn_mva') {
  const salgspris = parseFloat(req.query.salgspris);
  const regavgift = parseFloat(req.query.regavgift);
  const co2 = parseFloat(req.query.co2);

  const { data, error } = await supabase.rpc('beregn_mva_detaljert', {
    salgspris,
    regavgift,
    co2
  });

  if (error || !data?.length) return res.status(500).json({ error: 'Feil i MVA-funksjon' });
  return res.status(200).json(data[0]);
}

else if (action === 'bilvisning_full') {
  const vin = req.query.vin;
  if (!vin) return res.status(400).json({ error: 'VIN mangler' });

  const { data, error } = await supabase
    .from('bilvisning_full_view')
    .select('*')
    .eq('vin', vin)
    .maybeSingle();

  if (error || !data) {
    return res.status(404).json({ error: 'Fant ikke data i bilvisning_full_view' });
  }

  let prCodes = [];

  // PR-koder kan enten ligge som ferdig array i viewet, eller må hentes separat
  if (Array.isArray(data.prCodes)) {
    prCodes = data.prCodes.map(row => ({
      prCode: row.prCode,
      desc: row.desc,
      valuation: row.valuation ?? 0
    }));
  } else {
    const { data: prCodeData, error: prError } = await supabase
      .from('pr_koder_med_verdi')
      .select('prCode, desc, valuation')
      .eq('vin', vin);

    if (!prError && prCodeData) {
      prCodes = prCodeData.map(row => ({
        prCode: row.prCode,
        desc: row.desc,
        valuation: row.valuation ?? 0
      }));
    }
  }

  return res.status(200).json({ bil: data, prCodes });
}

else if (action === 'biler_full_view') {
  const { data, error } = await supabase
    .from('bilvisning_full_view')
    .select('*');

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json(data);
}


return res.status(400).json({ error: 'Ugyldig forespørsel' });
}
