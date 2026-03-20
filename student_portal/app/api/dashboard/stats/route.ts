import { NextResponse } from "next/server"
import { dashboardApi } from "@/lib/api"

export async function GET() {
  try {
    const stats = await dashboardApi.getStats()
    return NextResponse.json(stats)
  } catch (error) {
    console.error("Dashboard stats error:", error)
    
    // Return default stats structure even if there's an error
    return NextResponse.json({
      totalExams: 0,
      activeExams: 0,
      totalStudents: 0,
      averageScore: 0,
      recentExams: [],
      recentAttempts: [],
    })
  }
}
