import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { WhatsAppFloatingButton } from "@/components/WhatsAppFloatingButton";
import { getConfiguracion } from "@/lib/config";
import { CheckoutClient } from "./CheckoutClient";

export default async function CheckoutPage() {
  const config = await getConfiguracion();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#ffeef7,transparent_42%),#fff7ef] text-slate-800">
      <main className="mx-auto w-full max-w-[1260px] px-3 pb-6 pt-3 sm:px-6">
        <Header />
        <CheckoutClient
          configDomicilio={{
            valor_domicilio_base: config.valor_domicilio_base,
            domicilio_gratis_activo: config.domicilio_gratis_activo,
          }}
        />
        <Footer />
        <WhatsAppFloatingButton />
      </main>
    </div>
  );
}
