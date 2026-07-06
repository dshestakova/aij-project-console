"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

function getLoginErrorMessage(message: string) {
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes("invalid login credentials") ||
    normalizedMessage.includes("invalid credentials")
  ) {
    return "Неверный email или пароль.";
  }

  if (normalizedMessage.includes("email not confirmed")) {
    return "Email пользователя не подтвержден в Supabase.";
  }

  if (normalizedMessage.includes("missing")) {
    return "Не настроено подключение к Supabase. Проверьте переменные окружения.";
  }

  return "Не удалось войти. Проверьте данные и попробуйте еще раз.";
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      try {
        const supabase = createBrowserSupabaseClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!isMounted) {
          return;
        }

        if (user) {
          router.replace("/dashboard");
          return;
        }
      } catch {
        if (isMounted) {
          setErrorMessage(
            "Не настроено подключение к Supabase. Проверьте переменные окружения.",
          );
        }
      } finally {
        if (isMounted) {
          setIsCheckingSession(false);
        }
      }
    }

    checkSession();

    return () => {
      isMounted = false;
    };
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMessage(getLoginErrorMessage(error.message));
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setErrorMessage(
        "Не настроено подключение к Supabase. Проверьте переменные окружения.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-[#f5f7fb] px-4 py-8 text-slate-950 sm:px-6">
      <section className="mx-auto flex w-full max-w-md flex-col justify-center">
        <div className="mb-8">
          <p className="text-sm font-medium text-slate-500">
            AIJ Project Console
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">
            Вход в консоль
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Доступ открыт только для пользователей, созданных администратором.
          </p>
        </div>

        <form
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          onSubmit={handleSubmit}
        >
          <div className="flex flex-col gap-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Email</span>
              <input
                autoComplete="email"
                className="mt-2 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                disabled={isCheckingSession || isSubmitting}
                inputMode="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@company.ru"
                required
                type="email"
                value={email}
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Пароль</span>
              <input
                autoComplete="current-password"
                className="mt-2 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                disabled={isCheckingSession || isSubmitting}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Введите пароль"
                required
                type="password"
                value={password}
              />
            </label>
          </div>

          {errorMessage ? (
            <p className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm leading-6 text-rose-800">
              {errorMessage}
            </p>
          ) : null}

          <button
            className="mt-5 h-11 w-full rounded-md bg-slate-950 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={isCheckingSession || isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Входим..." : "Войти"}
          </button>
        </form>
      </section>
    </main>
  );
}
