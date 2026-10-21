import { NextResponse } from "next/server";
import { FAILURE, REPORT_FILENAME, loadPurchase, renderPurchasePdf } from "@/lib/pro-fulfilment";
import { captureServerError } from "@/lib/observability";

// Delivers the Pro report PDF for a paid Checkout Session.
//
// Access is tied to the session: every request fetches the session from Stripe
// and checks it is a paid one-time payment for our price, with the calculator
// numbers we stored on it. The success redirect alone grants nothing, and
// neither does knowing a session id for somebody else's product. The link stops
// working DOWNLOAD_WINDOW_DAYS after the payment. The report is rebuilt from
// the stored inputs on each request, so no file is kept anywhere.
//
// Never cached: the response is one buyer's document.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("session_id") ?? "";
  const found = await loadPurchase(id);
  if (!found.ok) {
    const { status, message } = FAILURE[found.reason];
    return NextResponse.json({ message }, { status, headers: { "Cache-Control": "private, no-store" } });
  }

  try {
    const pdf = await renderPurchasePdf(found.purchase);
    // Copy into a plain ArrayBuffer-backed array, which is what Response accepts.
    const body = new Uint8Array(pdf.byteLength);
    body.set(pdf);
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${REPORT_FILENAME}"`,
        "Content-Length": String(body.byteLength),
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch (err) {
    captureServerError(err, { scope: "report" });
    return NextResponse.json({ message: "We could not build the report just now. Please try again." }, { status: 500, headers: { "Cache-Control": "private, no-store" } });
  }
}
