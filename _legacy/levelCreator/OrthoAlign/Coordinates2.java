
public class Coordinates2 {

	
	public int value, y, x, flag;   // value : différence entre y et x
									//  flag : valeur binaire pour indiquer sur quel génome on est 0(X) 1(Y)
									// x : abcisse la plus a droite	
									// y : la plus a gauche
	
	
	//parfois value veut dire le type de couverture 0 match, 1 sub, 2 transp, 3 inversion, 4 ly
	// 5 dx, 6 dix, 7 dxy, 8 dixy, 9 lx, 10 dy, 11 diy, 12 dyx, 13 diyx
	
	
	public Coordinates2(){}
	
	
	public Coordinates2(int v, int j, int i, int fl)
		
		{
		
			this.value=v;
			this.y=j;
			this.x=i;
			this.flag=fl;
		
		}
	
	
	
	public void setValue(int v)
		{
			this.value=v;
		
		
		}
	
	
	
	
	
	public int getValue()
	{
		
		return this.value;
	
	
	}
	
	
	public void setXY(int v, int w, int val)
	{
		this.y=v;
		this.x=w;
		
		this.value=val;
	
	}
	
	
	/*
	
	
	public void update(Coordinates co)
		{
		
			if (x==co.x)
				{
					if (y==co.y) 
						{
							x=-1;
							y=-1;
							value=0;
						}
				
					else 
						{
							x=co.y-1;
							value=x-y+1;
						}
					
				
				}
		
			else
				{
					y=co.x+1;
					value=x-y+1;
				
				}
			
		
		}
	
	
	*/
	
	
	
	
}