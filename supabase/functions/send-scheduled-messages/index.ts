import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Checking for scheduled messages to send...");

    // Get all unsent scheduled messages that are due
    const { data: scheduledMessages, error: fetchError } = await supabase
      .from("scheduled_messages")
      .select("*")
      .eq("sent", false)
      .lte("scheduled_time", new Date().toISOString());

    if (fetchError) {
      console.error("Error fetching scheduled messages:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${scheduledMessages?.length || 0} messages to send`);

    if (!scheduledMessages || scheduledMessages.length === 0) {
      return new Response(
        JSON.stringify({ message: "No messages to send", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send each message
    const results = await Promise.all(
      scheduledMessages.map(async (scheduled) => {
        try {
          // Insert the message
          const { error: insertError } = await supabase.from("messages").insert({
            conversation_id: scheduled.conversation_id,
            sender_id: scheduled.sender_id,
            content: scheduled.content,
            media_url: scheduled.media_url,
            type: scheduled.media_url ? "media" : "text",
          });

          if (insertError) {
            console.error(`Error inserting message ${scheduled.id}:`, insertError);
            return { id: scheduled.id, success: false, error: insertError };
          }

          // Mark as sent
          const { error: updateError } = await supabase
            .from("scheduled_messages")
            .update({ sent: true })
            .eq("id", scheduled.id);

          if (updateError) {
            console.error(`Error updating scheduled message ${scheduled.id}:`, updateError);
            return { id: scheduled.id, success: false, error: updateError };
          }

          console.log(`Successfully sent scheduled message ${scheduled.id}`);
          return { id: scheduled.id, success: true };
        } catch (error) {
          console.error(`Error processing scheduled message ${scheduled.id}:`, error);
          return { id: scheduled.id, success: false, error };
        }
      })
    );

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    console.log(`Sent ${successCount} messages, ${failCount} failed`);

    return new Response(
      JSON.stringify({
        message: "Scheduled messages processed",
        sent: successCount,
        failed: failCount,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-scheduled-messages:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
