import { afterEach, describe, expect, it, vi } from "vitest";
import { sendGreenApiMessage } from "@/lib/greenapi/client";

function configureGreenApi() {
  process.env.GREEN_API_INSTANCE_ID = "710700000001";
  process.env.GREEN_API_TOKEN = "test-token";
  process.env.GREEN_API_URL = "https://7107.api.greenapi.com";
  process.env.WHATSAPP_OUTBOUND_ENABLED = "true";
}

describe("Green API rich WhatsApp delivery", () => {
  afterEach(() => {
    delete process.env.GREEN_API_INSTANCE_ID;
    delete process.env.GREEN_API_TOKEN;
    delete process.env.GREEN_API_URL;
    delete process.env.WHATSAPP_OUTBOUND_ENABLED;
    vi.unstubAllGlobals();
  });

  it("sends a product photo followed by a hidden checkout URL button", async () => {
    configureGreenApi();
    const fetchMock = vi.fn<typeof fetch>(async () =>
      new Response(JSON.stringify({ idMessage: "green-1" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendGreenApiMessage({
      to: "51999888777",
      text: "Tu selección está lista",
      rich: {
        image: {
          url: "https://wbstraders.pe/products/casa-malbec.webp",
          fileName: "casa-malbec.webp",
          caption: "Casa Malbec",
        },
        actionButtons: [
          {
            type: "url",
            id: "checkout",
            text: "Comprar selección 🛒",
            url: `https://wbstraders.pe/w/${"a".repeat(64)}`,
          },
        ],
      },
    });

    expect(result.sent).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/sendFileByUrl/");
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("/sendInteractiveButtons/");
    const request = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));
    expect(request.buttons[0]).toMatchObject({
      type: "url",
      buttonText: "Comprar selección 🛒",
    });
    expect(request.body).not.toContain("https://");
  });

  it("falls back to normal text when Green API beta buttons fail", async () => {
    configureGreenApi();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("{}", { status: 500 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ idMessage: "green-fallback" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendGreenApiMessage({
      to: "51999888777",
      text: "¿Qué prefieres?",
      rich: {
        replyButtons: [
          { id: "red", text: "Tintos 🍷" },
          { id: "white", text: "Blancos 🥂" },
        ],
      },
    });

    expect(result).toMatchObject({ sent: true, messageId: "green-fallback" });
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/sendInteractiveButtonsReply/");
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("/sendMessage/");
    const fallback = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));
    expect(fallback.message).toContain("Tintos 🍷");
    expect(fallback.message).toContain("Blancos 🥂");
  });
});
