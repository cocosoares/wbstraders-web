import { afterEach, describe, expect, it } from "vitest";
import { sendYCloudTemplate, sendYCloudText } from "@/lib/ycloud/client";

describe("sendYCloudTemplate", () => {
  afterEach(() => {
    delete process.env.YCLOUD_API_KEY;
    delete process.env.YCLOUD_WHATSAPP_NUMBER;
    delete process.env.YCLOUD_PAYMENT_CONFIRMED_TEMPLATE;
    delete process.env.YCLOUD_TEMPLATE_LANGUAGE;
    delete process.env.WHATSAPP_OUTBOUND_ENABLED;
  });

  it("is an explicit no-op without complete configuration", async () => {
    await expect(sendYCloudTemplate({ to: "+51999888777" })).resolves.toEqual({
      sent: false,
      reason: "not_configured",
    });
  });

  it("keeps free-form outbound replies disabled until explicitly activated", async () => {
    await expect(sendYCloudText({ to: "+51999888777", text: "Hola" })).resolves.toEqual({
      sent: false,
      reason: "disabled",
    });
  });
});
