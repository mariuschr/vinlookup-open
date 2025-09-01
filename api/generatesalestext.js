export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  console.log("Serverless function called.");

  if (req.method !== 'POST') {
    console.log("Wrong method:", req.method);
    return res.status(405).json({ error: 'Only POST requests allowed' });
  }

  let body;
  try {
    body = await new Promise((resolve, reject) => {
      let data = '';
      req.on('data', chunk => data += chunk);
      req.on('end', () => resolve(JSON.parse(data)));
      req.on('error', reject);
    });
  } catch (err) {
    console.error("Body parsing error:", err);
    return res.status(500).json({ error: 'Body parsing error' });
  }

  const { model, color, topUtstyr } = body;
  console.log("Parsed body:", body);

  const openAIApiKey = process.env.OPENAI_API_KEY;

  if (!openAIApiKey) {
    console.error("API key missing.");
    return res.status(500).json({ error: 'OpenAI API Key not configured' });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          
          /*{ role: "system", content: "Du er en erfaren bilselger som skriver skreddersydde salgstekster." },
          { role: "user", content: `Lag en fengende, profesjonell introduksjon som forklarer hvorfor akkurat denne bilen skiller seg ut fra andre lignende biler. Ikke fokuser på modellen generelt, men på bilens unike ekstrautstyr som skiller denne fra mengden. Fremhev og utdyp følgende ekstrautstyr basert på produsentens beskrivelser: ${topUtstyr.join(", ")}. Bruk utdypende, lettfattelige beskrivelser som gjør utstyret attraktivt for kjøpere, uten å være for pompøs og med for lange setninger.

Bruk følgende informasjon:
- Modell: ${model}
- Farge: ${color || 'ukjent'}

Skriv kort, presist og selgende uten å bruke ord som 'verdi' eller 'pris'. Unngå teknisk sjargong.` }
        ],
        */
          { role: "system", content: "Du er en erfaren bilselger som skriver korte, overbevisende salgstekster som fremhever bilens unike utstyr. Du skriver med selvtillit og presisjon, uten overdrevne adjektiv eller lange setninger." },
          { role: "user", content: `Kunden kjenner allerede til bilmodellen. Skriv derfor en direkte og slagkraftig annonsetekst som raskt fremhever hvorfor akkurat denne bilen skiller seg ut – på grunn av utstyrskombinasjonen.

Fremhev følgende ekstrautstyr på en konkret og lettfattelig måte, og forklar kort hvorfor det gjør bilen mer attraktiv: ${topUtstyr.join(", ")}.

Ikke bruk ord som "verdi", "pris", eller teknisk sjargong. Ikke fokuser på bilen generelt, kun hvorfor denne er ekstra interessant. Teksten skal være kort, engasjerende og selgende – og få kunden til å ville se bilen.

Tilleggsinfo:
- Modell: ${model}
- Farge: ${color || 'ukjent'}`
  }
],
        temperature: 0.7
      })
    });

    const openaiResult = await response.json();
    console.log("OpenAI response:", openaiResult);

    if (!response.ok) {
      return res.status(500).json({ error: openaiResult });
    }

    res.status(200).json({ text: openaiResult.choices?.[0]?.message?.content || '' });

  } catch (err) {
    console.error("Catch block error:", err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
}
