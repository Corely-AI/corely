using System.Runtime.InteropServices;

namespace EricWategay.Api.Runtime.Native;

internal static class EricNativeMethods
{
    private const string EricLibrary = "ericapi";

    // Entry points are based on ERiC C header naming and intentionally scaffolded only.
    [DllImport(EricLibrary, EntryPoint = "EricInitialisiere", CallingConvention = CallingConvention.Cdecl)]
    internal static extern int EricInitialisiere(IntPtr configPointer, out IntPtr contextHandle);

    [DllImport(EricLibrary, EntryPoint = "EricBearbeiteVorgang", CallingConvention = CallingConvention.Cdecl)]
    internal static extern int EricBearbeiteVorgang(IntPtr contextHandle, IntPtr requestPointer, out IntPtr responsePointer);

    [DllImport(EricLibrary, EntryPoint = "EricHoleFehlerText", CallingConvention = CallingConvention.Cdecl)]
    internal static extern IntPtr EricHoleFehlerText(int errorCode);

    [DllImport(EricLibrary, EntryPoint = "EricBeende", CallingConvention = CallingConvention.Cdecl)]
    internal static extern int EricBeende(IntPtr contextHandle);
}
