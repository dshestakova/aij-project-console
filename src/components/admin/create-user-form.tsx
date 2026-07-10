"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { UserRole } from "@/types/project-registry";

const roleOptions: Array<{ value: UserRole; label: string }> = [
  { value: "viewer", label: "Наблюдатель" },
  { value: "editor", label: "Редактор" },
  { value: "admin", label: "Администратор" },
];

type CreatedUserResult = {
  email: string;
  display_name: string | null;
  role: UserRole;
  temporary_password: string;
};

export function CreateUserForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<UserRole>("viewer");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [message, setMessage] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  const [createdUser, setCreatedUser] = useState<CreatedUserResult | null>(null);
  const [copyMessage, setCopyMessage] = useState("");

  function handleGeneratePassword() {
    setTemporaryPassword(generateTemporaryPassword());
    setCreatedUser(null);
    setCopyMessage("");
  }

  function handleCreateUser() {
    setMessage(null);
    setCreatedUser(null);
    setCopyMessage("");

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/users/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            display_name: displayName,
            role,
            temporary_password: temporaryPassword,
          }),
        });
        const payload = (await response.json()) as {
          ok?: boolean;
          message?: string;
          user?: {
            email: string;
            display_name: string | null;
            role: UserRole;
          };
          temporary_password?: string;
        };

        if (!response.ok || !payload.ok || !payload.user) {
          setMessage({
            ok: false,
            text:
              payload.message ??
              "Не удалось создать пользователя. Проверьте данные и права доступа.",
          });
          return;
        }

        setCreatedUser({
          email: payload.user.email,
          display_name: payload.user.display_name,
          role: payload.user.role,
          temporary_password: payload.temporary_password ?? temporaryPassword,
        });
        setMessage({
          ok: true,
          text: "Пользователь создан. Временный пароль показан ниже один раз.",
        });
        setEmail("");
        setDisplayName("");
        setRole("viewer");
        setTemporaryPassword("");
        router.refresh();
      } catch {
        setMessage({
          ok: false,
          text: "Не удалось создать пользователя. Проверьте подключение и попробуйте еще раз.",
        });
      }
    });
  }

  async function handleCopyPassword() {
    if (!createdUser?.temporary_password) {
      return;
    }

    await navigator.clipboard.writeText(createdUser.temporary_password);
    setCopyMessage("Пароль скопирован.");
  }

  const canSubmit =
    email.trim() && role && temporaryPassword && temporaryPassword.length >= 14;

  return (
    <section className="min-w-0 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">
            Создать пользователя
          </h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            Пользователь будет создан в Supabase Auth, а роль сохранится в
            public.profiles. Публичная регистрация не используется.
          </p>
        </div>
      </div>

      <div className="mt-4 grid min-w-0 gap-3 lg:grid-cols-[minmax(220px,1fr)_minmax(180px,0.8fr)_180px]">
        <label className="block min-w-0">
          <span className="text-sm font-medium text-slate-700">Email</span>
          <input
            className="mt-2 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="user@example.com"
            type="email"
            value={email}
          />
        </label>
        <label className="block min-w-0">
          <span className="text-sm font-medium text-slate-700">
            Имя / отображаемое имя
          </span>
          <input
            className="mt-2 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Как показывать в системе"
            type="text"
            value={displayName}
          />
        </label>
        <label className="block min-w-0">
          <span className="text-sm font-medium text-slate-700">Роль</span>
          <select
            className="mt-2 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
            onChange={(event) => setRole(event.target.value as UserRole)}
            value={role}
          >
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-end">
          <label className="block min-w-0 flex-1">
            <span className="text-sm font-medium text-slate-700">
              Временный пароль
            </span>
            <input
              className="mt-2 h-11 w-full rounded-md border border-slate-200 bg-white px-3 font-mono text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
              onChange={(event) => {
                setTemporaryPassword(event.target.value);
                setCreatedUser(null);
              }}
              placeholder="Сгенерируйте временный пароль"
              type="text"
              value={temporaryPassword}
            />
          </label>
          <button
            className="h-11 w-full rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-950 lg:w-auto"
            onClick={handleGeneratePassword}
            type="button"
          >
            Сгенерировать пароль
          </button>
          <button
            className="h-11 w-full rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 lg:w-auto"
            disabled={isPending || !canSubmit}
            onClick={handleCreateUser}
            type="button"
          >
            {isPending ? "Создаем..." : "Создать пользователя"}
          </button>
        </div>
        <p className="mt-3 text-sm leading-6 text-amber-700">
          Пароль показывается один раз. Скопируйте его и передайте пользователю
          безопасным способом.
        </p>
      </div>

      {message ? (
        <div
          className={`mt-4 rounded-lg border p-4 text-sm ${
            message.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      {createdUser ? (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="font-semibold">Пользователь создан</p>
          <p className="mt-2">Email: {createdUser.email}</p>
          <p>Роль: {getRoleLabel(createdUser.role)}</p>
          <div className="mt-3 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
            <code className="min-w-0 break-all rounded-md bg-white px-3 py-2 font-mono text-sm text-slate-950">
              {createdUser.temporary_password}
            </code>
            <button
              className="h-10 w-full rounded-md border border-emerald-200 bg-white px-3 text-sm font-semibold text-emerald-800 transition hover:border-emerald-300 sm:w-auto"
              onClick={handleCopyPassword}
              type="button"
            >
              Скопировать пароль
            </button>
          </div>
          {copyMessage ? <p className="mt-2 text-emerald-700">{copyMessage}</p> : null}
        </div>
      ) : null}
    </section>
  );
}

function generateTemporaryPassword() {
  const lowercase = "abcdefghjkmnpqrstuvwxyz";
  const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const symbols = "!@#$%^&*_-+=";
  const allCharacters = lowercase + uppercase + digits + symbols;
  const requiredCharacters = [
    getRandomCharacter(lowercase),
    getRandomCharacter(uppercase),
    getRandomCharacter(digits),
    getRandomCharacter(symbols),
  ];
  const remainingCharacters = Array.from({ length: 12 }, () =>
    getRandomCharacter(allCharacters),
  );

  return shuffleCharacters([...requiredCharacters, ...remainingCharacters]).join(
    "",
  );
}

function getRandomCharacter(characters: string) {
  const randomValues = new Uint32Array(1);
  crypto.getRandomValues(randomValues);
  return characters[randomValues[0] % characters.length];
}

function shuffleCharacters(characters: string[]) {
  return characters
    .map((character) => ({
      character,
      sort: crypto.getRandomValues(new Uint32Array(1))[0],
    }))
    .sort((first, second) => first.sort - second.sort)
    .map((item) => item.character);
}

function getRoleLabel(role: UserRole) {
  return roleOptions.find((option) => option.value === role)?.label ?? role;
}
