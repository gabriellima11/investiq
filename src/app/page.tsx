import { redirect } from "next/navigation";

// A home leva direto para a carteira; o proxy manda para /login se não houver sessão.
export default function Home() {
  redirect("/carteira");
}
