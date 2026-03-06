using System.Runtime.InteropServices;

namespace EricWategay.Api.Runtime.Native;

public sealed class EricNativeContextHandle : SafeHandle
{
    public EricNativeContextHandle()
        : base(IntPtr.Zero, ownsHandle: true)
    {
    }

    public override bool IsInvalid => handle == IntPtr.Zero;

    public static EricNativeContextHandle FromHandle(IntPtr nativeHandle)
    {
        var handle = new EricNativeContextHandle();
        handle.SetHandle(nativeHandle);
        return handle;
    }

    public static EricNativeContextHandle CreateInvalid()
    {
        return new EricNativeContextHandle();
    }

    protected override bool ReleaseHandle()
    {
        if (IsInvalid)
        {
            return true;
        }

        try
        {
            _ = EricNativeMethods.EricBeende(handle);
        }
        catch
        {
            // Ignore release errors in scaffold mode.
        }

        return true;
    }
}
