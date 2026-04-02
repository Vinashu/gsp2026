
public class Coordinates {

	
	public int value, y, x;   // value : différence entre y et x
									
									//x : abcisse la plus a droite
	
									// y : la plus a gauche
	
	public Coordinates(){}
	
	
	public Coordinates(int v, int j, int i)
		
		{
		
			this.value=v;
			this.y=j;
			this.x=i;
		
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