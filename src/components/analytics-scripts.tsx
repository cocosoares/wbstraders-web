"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { readConsent, type ConsentChoice } from "./consent-banner";

const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const gtmId = process.env.NEXT_PUBLIC_GTM_ID;

export function AnalyticsScripts() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(readConsent()?.analytics === true);
    const update = (event: Event) => {
      setEnabled(
        (event as CustomEvent<ConsentChoice>).detail?.analytics === true,
      );
    };
    window.addEventListener("wbs:consent-updated", update);
    return () => window.removeEventListener("wbs:consent-updated", update);
  }, []);

  if (!enabled) return null;

  if (gtmId) {
    return (
      <Script id="wbs-gtm" strategy="afterInteractive">
        {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId}');`}
      </Script>
    );
  }

  if (!gaId) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id="wbs-ga4" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
gtag('js',new Date());gtag('config','${gaId}',{send_page_view:true});`}
      </Script>
    </>
  );
}
