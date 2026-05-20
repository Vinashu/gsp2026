package gesort;

/**
 * Represents the anchored matching core around the terminus.
 */
public final class AnchoredCore {
    public final int left;
    public final int right;
    public final int currentLeftFrontier;
    public final int currentRightFrontier;
    public final int targetLeftFrontier;
    public final int targetRightFrontier;

    public AnchoredCore(int left, int right, int currentLeftFrontier, int currentRightFrontier, int targetLeftFrontier, int targetRightFrontier) {
        this.left = left;
        this.right = right;
        this.currentLeftFrontier = currentLeftFrontier;
        this.currentRightFrontier = currentRightFrontier;
        this.targetLeftFrontier = targetLeftFrontier;
        this.targetRightFrontier = targetRightFrontier;
    }
}
