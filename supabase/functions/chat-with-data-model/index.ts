
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  console.log("Edge function received request:", req.method);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!openAIApiKey) {
      console.error("OpenAI API key is missing");
      return new Response(
        JSON.stringify({ error: 'OpenAI API key is not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const requestBody = await req.json();
    console.log("Request body received:", JSON.stringify(requestBody, null, 2));

    // Build a comprehensive prompt with the data model and any documents
    let fullPrompt = requestBody.message || "";
    
    // Add data model context if available
    if (requestBody.dataModel) {
      const entities = requestBody.dataModel.entities || [];
      const relationships = requestBody.dataModel.relationships || [];
      
      fullPrompt = `
I need information about this data model:

ENTITIES:
${entities.map(e => `- ${e.name} (${e.type}): ${e.definition}
  Attributes: ${e.attributes.map(a => `${a.name} (${a.type}${a.isPrimaryKey ? ', PK' : ''}${a.isForeignKey ? ', FK' : ''})`).join(', ')}
`).join('\n')}

RELATIONSHIPS:
${relationships.map(r => {
  const sourceEntity = entities.find(e => e.id === r.sourceEntityId)?.name || r.sourceEntityId;
  const targetEntity = entities.find(e => e.id === r.targetEntityId)?.name || r.targetEntityId;
  return `- ${sourceEntity} to ${targetEntity}: ${r.name || 'Relationship'} (${r.sourceCardinality || '1'}:${r.targetCardinality || '1'}) - ${r.description || 'No description'}`;
}).join('\n')}

${requestBody.documentsContext ? `
RELATED DOCUMENTS:
${requestBody.documentsContext}
` : ''}

User question: ${requestBody.message}

Please provide a thorough and accurate answer based on this information.
`;
    }

    console.log("Sending prompt to OpenAI:", fullPrompt.substring(0, 200) + "...");

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',  // Using a stable, available model
        messages: [
          { 
            role: 'system', 
            content: 'You are a data model expert who helps users understand their database schemas, entity relationships, and how to query data effectively. Provide accurate, detailed responses based on the information given. If something is unclear or missing from the data model, acknowledge that limitation.'
          },
          { role: 'user', content: fullPrompt }
        ],
        max_tokens: 2000,
        temperature: 0.5
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to get response from OpenAI API', details: errorText }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const data = await response.json();
    if (!data.choices || !data.choices[0]?.message?.content) {
      throw new Error('Invalid response from OpenAI');
    }

    const aiResponse = data.choices[0].message.content;
    console.log("AI Response generated successfully:", aiResponse.substring(0, 100) + "...");

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error in chat-with-data-model function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unexpected server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
