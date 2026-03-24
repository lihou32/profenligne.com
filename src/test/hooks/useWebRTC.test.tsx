/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-this-alias */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor, act } from "@testing-library/react"
import { useWebRTC } from "@/hooks/useWebRTC"

const mockUseAuth = vi.fn()
const mockInsert = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockOrder = vi.fn()
const mockLimit = vi.fn()
const mockChannelOn = vi.fn()
const mockChannelSubscribe = vi.fn()
const mockRemoveChannel = vi.fn()

class FakeTrack {
  kind: "video" | "audio"
  enabled = true
  stop = vi.fn()
  onended: (() => void) | null = null

  constructor(kind: "video" | "audio") {
    this.kind = kind
  }
}

class FakeMediaStream {
  private tracks: FakeTrack[]

  constructor(tracks: FakeTrack[] = [new FakeTrack("video"), new FakeTrack("audio")]) {
    this.tracks = tracks
  }

  getTracks() {
    return this.tracks
  }

  getVideoTracks() {
    return this.tracks.filter((t) => t.kind === "video")
  }

  getAudioTracks() {
    return this.tracks.filter((t) => t.kind === "audio")
  }

  addTrack(track: FakeTrack) {
    this.tracks.push(track)
  }
}

let lastPeer: any

class FakePeerConnection {
  localDescription: any = null
  remoteDescription: any = null
  connectionState = "new"
  ontrack: ((event: any) => void) | null = null
  onicecandidate: ((event: any) => void) | null = null
  onconnectionstatechange: (() => void) | null = null

  addTrack = vi.fn()
  createOffer = vi.fn().mockResolvedValue({ type: "offer", sdp: "offer-sdp" })
  createAnswer = vi.fn().mockResolvedValue({ type: "answer", sdp: "answer-sdp" })
  setLocalDescription = vi.fn(async (desc: any) => {
    this.localDescription = desc
  })
  setRemoteDescription = vi.fn(async (desc: any) => {
    this.remoteDescription = desc
  })
  addIceCandidate = vi.fn().mockResolvedValue(undefined)
  getSenders = vi.fn().mockReturnValue([
    { track: { kind: "video" }, replaceTrack: vi.fn().mockResolvedValue(undefined) },
  ])
  close = vi.fn(() => {
    this.connectionState = "closed"
  })

  constructor() {
    lastPeer = this
  }
}

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...args: any[]) => (globalThis as any).__mockFrom(...args),
    channel: (...args: any[]) => (globalThis as any).__mockChannel(...args),
    removeChannel: (...args: any[]) => (globalThis as any).__mockRemoveChannel(...args),
  },
}))

describe("useWebRTC", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({ user: { id: "user-1" } })

    mockInsert.mockResolvedValue({ data: null, error: null })
    mockLimit.mockResolvedValue({ data: [], error: null })
    mockOrder.mockReturnValue({ limit: mockLimit })
    mockEq.mockReturnValue({ order: mockOrder, eq: mockEq })
    mockSelect.mockReturnValue({ eq: mockEq })

    ;(globalThis as any).__mockFrom = vi.fn(() => ({
      insert: mockInsert,
      select: mockSelect,
      eq: mockEq,
      neq: vi.fn().mockResolvedValue({ data: [], error: null }),
    }))

    mockChannelSubscribe.mockReturnValue({})
    mockChannelOn.mockReturnValue({ subscribe: mockChannelSubscribe })
    ;(globalThis as any).__mockChannel = vi.fn(() => ({ on: mockChannelOn }))
    ;(globalThis as any).__mockRemoveChannel = mockRemoveChannel

    ;(globalThis as any).MediaStream = FakeMediaStream as any
    ;(globalThis as any).RTCPeerConnection = FakePeerConnection as any
    ;(globalThis as any).RTCSessionDescription = class {
      constructor(public value: any) {
        return value
      }
    } as any
    ;(globalThis as any).RTCIceCandidate = class {
      constructor(public value: any) {
        return value
      }
    } as any

    Object.defineProperty(globalThis.navigator, "mediaDevices", {
      value: {
        getUserMedia: vi.fn().mockResolvedValue(new FakeMediaStream()),
        getDisplayMedia: vi.fn().mockResolvedValue(new FakeMediaStream([new FakeTrack("video")])),
      },
      configurable: true,
    })
  })

  it("starts call and sends offer signal", async () => {
    const { result } = renderHook(() => useWebRTC("room-1"))

    await act(async () => {
      await result.current.startCall()
    })

    await waitFor(() => expect(mockInsert).toHaveBeenCalled())
    expect(mockInsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ room_id: "room-1", signal_type: "offer", sender_id: "user-1" }),
      ])
    )
    expect(lastPeer.createOffer).toHaveBeenCalled()
  })

  it("toggles audio/video and cleans streams on endCall", async () => {
    const { result } = renderHook(() => useWebRTC("room-2"))

    await act(async () => {
      await result.current.startCall()
    })

    act(() => {
      result.current.toggleVideo(false)
      result.current.toggleAudio(false)
    })

    const stream = result.current.localStream as any
    expect(stream.getVideoTracks()[0].enabled).toBe(false)
    expect(stream.getAudioTracks()[0].enabled).toBe(false)

    act(() => {
      result.current.endCall()
    })

    expect(lastPeer.close).toHaveBeenCalled()
    expect(result.current.localStream).toBeNull()
    expect(result.current.remoteStream).toBeNull()
  })
})
