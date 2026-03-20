import type { NextApiRequest, NextApiResponse } from "next"
import { createClient } from "@supabase/supabase-js"
import {
  codingApi,
  dashboardApi,
  examApi,
  monitorApi,
  questionApi,
  resultsApi,
} from "@/lib/api"
import {
  createAdminSession,
  getAdminCookieName,
  getAllowedAdmins,
} from "@/lib/admin-auth"
import {
  getProfileSettings,
  getSecuritySettings,
  saveProfileSettings,
  saveSecuritySettings,
} from "@/lib/app-config-store"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function json(res: NextApiResponse, status: number, payload: unknown) {
  res.status(status).json(payload)
}

function getPathSegments(req: NextApiRequest) {
  const raw = req.query.path
  if (Array.isArray(raw)) return raw
  if (typeof raw === "string") return [raw]
  return []
}

function getQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function setSessionCookie(
  res: NextApiResponse,
  cookieName: string,
  cookieValue: string,
  maxAge: number
) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : ""
  res.setHeader(
    "Set-Cookie",
    `${cookieName}=${cookieValue}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`
  )
}

function clearSessionCookie(res: NextApiResponse, cookieName: string) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : ""
  res.setHeader(
    "Set-Cookie",
    `${cookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`
  )
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const segments = getPathSegments(req)

  try {
    if (segments[0] === "auth" && segments[1] === "login") {
      if (req.method !== "POST") {
        res.setHeader("Allow", "POST")
        return json(res, 405, { error: "Method not allowed" })
      }

      const { email, password } = req.body ?? {}
      if (!email || !password) {
        return json(res, 400, { error: "Email and password are required." })
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error || !data.user?.email) {
        return json(res, 401, { error: "Invalid email or password." })
      }

      const normalizedEmail = data.user.email.toLowerCase()
      if (!getAllowedAdmins().includes(normalizedEmail)) {
        return json(res, 403, {
          error:
            "Access denied. Your account is not authorized to access the admin panel.",
        })
      }

      const session = await createAdminSession(normalizedEmail)
      setSessionCookie(res, session.name, session.value, session.maxAge)
      return json(res, 200, { success: true })
    }

    if (segments[0] === "auth" && segments[1] === "logout") {
      if (req.method !== "POST") {
        res.setHeader("Allow", "POST")
        return json(res, 405, { error: "Method not allowed" })
      }

      clearSessionCookie(res, getAdminCookieName())
      return json(res, 200, { success: true })
    }

    if (segments[0] === "dashboard" && segments[1] === "stats") {
      if (req.method !== "GET") {
        res.setHeader("Allow", "GET")
        return json(res, 405, { error: "Method not allowed" })
      }

      try {
        const stats = await dashboardApi.getStats()
        return json(res, 200, stats)
      } catch (error) {
        console.error("Dashboard stats error:", error)
        return json(res, 200, {
          totalExams: 0,
          activeExams: 0,
          totalStudents: 0,
          averageScore: 0,
          recentExams: [],
          recentAttempts: [],
        })
      }
    }

    if (segments[0] === "exams" && segments.length === 1) {
      if (req.method === "GET") {
        return json(res, 200, await examApi.getAll())
      }

      if (req.method === "POST") {
        return json(res, 200, await examApi.create(req.body))
      }

      res.setHeader("Allow", "GET, POST")
      return json(res, 405, { error: "Method not allowed" })
    }

    if (segments[0] === "exams" && segments.length === 2) {
      const examId = segments[1]

      if (req.method === "GET") {
        return json(res, 200, await examApi.getById(examId))
      }

      if (req.method === "PUT") {
        return json(res, 200, await examApi.update(examId, req.body))
      }

      if (req.method === "DELETE") {
        return json(res, 200, await examApi.delete(examId))
      }

      res.setHeader("Allow", "GET, PUT, DELETE")
      return json(res, 405, { error: "Method not allowed" })
    }

    if (
      segments[0] === "exams" &&
      segments[2] === "publish" &&
      segments.length === 3
    ) {
      if (req.method !== "POST") {
        res.setHeader("Allow", "POST")
        return json(res, 405, { error: "Method not allowed" })
      }

      return json(res, 200, await examApi.publish(segments[1]))
    }

    if (
      segments[0] === "exams" &&
      segments[2] === "questions" &&
      segments.length === 3
    ) {
      if (req.method === "GET") {
        return json(res, 200, await questionApi.getByExam(segments[1]))
      }

      if (req.method === "POST") {
        return json(res, 200, await questionApi.create(segments[1], req.body))
      }

      res.setHeader("Allow", "GET, POST")
      return json(res, 405, { error: "Method not allowed" })
    }

    if (
      segments[0] === "exams" &&
      segments[2] === "questions" &&
      segments.length === 4
    ) {
      if (req.method === "PUT") {
        return json(
          res,
          200,
          await questionApi.update(segments[1], segments[3], req.body)
        )
      }

      if (req.method === "DELETE") {
        return json(res, 200, await questionApi.delete(segments[1], segments[3]))
      }

      res.setHeader("Allow", "PUT, DELETE")
      return json(res, 405, { error: "Method not allowed" })
    }

    if (
      segments[0] === "exams" &&
      segments[2] === "coding" &&
      segments.length === 3
    ) {
      if (req.method === "GET") {
        return json(res, 200, await codingApi.getByExam(segments[1]))
      }

      if (req.method === "POST") {
        return json(res, 200, await codingApi.create(segments[1], req.body))
      }

      res.setHeader("Allow", "GET, POST")
      return json(res, 405, { error: "Method not allowed" })
    }

    if (
      segments[0] === "exams" &&
      segments[2] === "coding" &&
      segments.length === 4
    ) {
      if (req.method === "PUT") {
        return json(
          res,
          200,
          await codingApi.update(segments[1], segments[3], req.body)
        )
      }

      if (req.method === "DELETE") {
        return json(res, 200, await codingApi.delete(segments[1], segments[3]))
      }

      res.setHeader("Allow", "PUT, DELETE")
      return json(res, 405, { error: "Method not allowed" })
    }

    if (segments[0] === "monitoring" && segments.length === 1) {
      if (req.method !== "GET") {
        res.setHeader("Allow", "GET")
        return json(res, 405, { error: "Method not allowed" })
      }

      const examId = getQueryValue(req.query.examId)
      return json(res, 200, await monitorApi.getActiveSessions(examId))
    }

    if (
      segments[0] === "monitoring" &&
      segments[2] === "terminate" &&
      segments.length === 3
    ) {
      if (req.method !== "POST") {
        res.setHeader("Allow", "POST")
        return json(res, 405, { error: "Method not allowed" })
      }

      return json(res, 200, await monitorApi.terminateSession(segments[1]))
    }

    if (segments[0] === "results" && segments.length === 1) {
      if (req.method !== "GET") {
        res.setHeader("Allow", "GET")
        return json(res, 405, { error: "Method not allowed" })
      }

      const examId = getQueryValue(req.query.examId)
      return json(res, 200, await resultsApi.getByExam(examId))
    }

    if (segments[0] === "results" && segments[1] === "coding") {
      if (req.method !== "GET") {
        res.setHeader("Allow", "GET")
        return json(res, 405, { error: "Method not allowed" })
      }

      const examId = getQueryValue(req.query.examId)
      return json(res, 200, await resultsApi.getCodingSubmissions(examId))
    }

    if (segments[0] === "settings" && segments[1] === "security") {
      if (req.method === "GET") {
        return json(res, 200, await getSecuritySettings())
      }

      if (req.method === "PUT") {
        return json(res, 200, await saveSecuritySettings(req.body))
      }

      res.setHeader("Allow", "GET, PUT")
      return json(res, 405, { error: "Method not allowed" })
    }

    if (segments[0] === "settings" && segments[1] === "profile") {
      if (req.method === "GET") {
        return json(res, 200, await getProfileSettings())
      }

      if (req.method === "PUT") {
        return json(res, 200, await saveProfileSettings(req.body))
      }

      res.setHeader("Allow", "GET, PUT")
      return json(res, 405, { error: "Method not allowed" })
    }

    return json(res, 404, { error: "Not found" })
  } catch (error) {
    console.error("Pages API fallback error:", error)
    return json(res, 500, {
      error: error instanceof Error ? error.message : "Internal server error",
    })
  }
}
