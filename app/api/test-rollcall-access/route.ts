import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const opportunityId = searchParams.get('id');

  if (!opportunityId) {
    return NextResponse.json({ error: "Opportunity ID required" }, { status: 400 });
  }

  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get opportunity details
    const { data: opp, error: oppError } = await supabase
      .from("opportunities")
      .select(`
        id, title, description, location, start_time, end_time,
        organizations!inner (name, owner)
      `)
      .eq("id", opportunityId)
      .single();

    if (oppError || !opp) {
      return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
    }

    const owner = opp.organizations[0]?.owner;
    const isOwner = owner === user.id;

    return NextResponse.json({
      currentUser: {
        id: user.id,
        email: user.email
      },
      opportunity: {
        id: opp.id,
        title: opp.title
      },
      organization: opp.organizations[0],
      ownershipCheck: {
        owner,
        currentUser: user.id,
        isOwner,
        match: owner === user.id
      }
    });

  } catch (error) {
    console.error("Error in test-rollcall-access:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 